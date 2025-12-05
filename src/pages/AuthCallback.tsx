import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('[AuthCallback] Processing OAuth callback...');

                // Get the session from URL hash (Supabase handles this automatically)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('[AuthCallback] Session error:', sessionError);
                    setError(sessionError.message);
                    return;
                }

                if (!session?.user) {
                    console.log('[AuthCallback] No session found, redirecting to auth...');
                    navigate('/auth', { replace: true });
                    return;
                }

                console.log('[AuthCallback] Session found:', {
                    email: session.user.email,
                    userId: session.user.id,
                    provider: session.user.app_metadata?.provider
                });

                // Check user role and redirect accordingly
                const isAdmin = isAdminEmail(session.user.email);

                // Check if user is a dentist
                const { data: roleData, error: roleError } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (roleError) {
                    console.error('[AuthCallback] Role check error:', roleError);
                }

                console.log('[AuthCallback] User role:', {
                    role: roleData?.role,
                    isAdmin
                });

                let redirectPath = '/dashboard';

                if (isAdmin) {
                    redirectPath = '/admin';
                } else if (roleData?.role === 'dentist') {
                    redirectPath = '/dentist-portal';
                }

                console.log('[AuthCallback] Redirecting to:', redirectPath);
                navigate(redirectPath, { replace: true });

            } catch (err) {
                console.error('[AuthCallback] Unexpected error:', err);
                setError('An unexpected error occurred during sign-in.');
            }
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Sign-In Error</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/auth', { replace: true })}
                        className="text-primary hover:underline"
                    >
                        Return to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Completing sign-in...</h2>
                <p className="text-muted-foreground">Please wait while we verify your account.</p>
            </div>
        </div>
    );
};

export default AuthCallback;
