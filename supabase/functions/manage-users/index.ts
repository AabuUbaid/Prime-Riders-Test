import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        const token = authHeader.replace("Bearer ", "")

        // Create Supabase Admin client using the service role key
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                }
            }
        )

        // Verify caller identity and token validity
        const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token)
        if (callerError || !callerUser) {
            return new Response(JSON.stringify({ error: "Invalid caller token: " + (callerError?.message || "User not found") }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // Verify caller role is "master"
        const callerEmail = (callerUser.email || "").trim().toLowerCase()
        const { data: roleRecord, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role, active")
            .eq("email", callerEmail)
            .maybeSingle()

        if (roleError || !roleRecord || roleRecord.role !== "master" || !roleRecord.active) {
            return new Response(JSON.stringify({ error: "Unauthorized: Page is restricted to active master users only" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // Read payload
        const { action, staffName, role, active, email, password, targetEmail } = await req.json()

        if (action === "create") {
            if (!staffName || !role || !email || !password) {
                return new Response(JSON.stringify({ error: "Missing required fields (staffName, role, email, password)" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            const emailNormalized = email.trim().toLowerCase()

            // Create Supabase Auth user
            const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
                email: emailNormalized,
                password,
                email_confirm: true,
                user_metadata: { role }
            })

            if (authCreateError) {
                return new Response(JSON.stringify({ error: "Failed to create authentication account: " + authCreateError.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            // Insert role row
            const { error: dbInsertError } = await supabaseAdmin
                .from("user_roles")
                .insert({
                    id: authUser.user.id,
                    email: emailNormalized,
                    role,
                    active: active ?? true,
                    display_name: staffName,
                    updated_at: new Date().toISOString()
                })

            if (dbInsertError) {
                // Rollback created Auth user to maintain transactional consistency
                await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
                return new Response(JSON.stringify({ error: "Failed to set user database permissions (rolled back auth account): " + dbInsertError.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            return new Response(JSON.stringify({ success: true, userId: authUser.user.id }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })

        } else if (action === "delete") {
            if (!targetEmail) {
                return new Response(JSON.stringify({ error: "Missing target email to delete" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            const targetEmailNormalized = targetEmail.trim().toLowerCase()

            // Look up target user inside user_roles to retrieve target ID
            const { data: targetRecord, error: targetFindError } = await supabaseAdmin
                .from("user_roles")
                .select("id, email")
                .eq("email", targetEmailNormalized)
                .maybeSingle()

            if (targetFindError) {
                return new Response(JSON.stringify({ error: "Failed finding target: " + targetFindError.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            // Delete database row
            const { error: dbDeleteError } = await supabaseAdmin
                .from("user_roles")
                .delete()
                .eq("email", targetEmailNormalized)

            if (dbDeleteError) {
                return new Response(JSON.stringify({ error: "Failed deleting database role row: " + dbDeleteError.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            // Find auth user ID
            let targetAuthId = targetRecord?.id
            if (!targetAuthId) {
                // Fallback: search Auth list by email address
                const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
                if (!listError && listData?.users) {
                    const matched = listData.users.find(u => (u.email || "").toLowerCase() === targetEmailNormalized)
                    if (matched) targetAuthId = matched.id
                }
            }

            if (targetAuthId) {
                const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthId)
                if (authDeleteError) {
                    return new Response(JSON.stringify({ error: "Security role deleted from DB, but failed deleting login credentials: " + authDeleteError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    })
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })

        } else {
            return new Response(JSON.stringify({ error: "Unsupported action context" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: "Runtime error: " + err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})
