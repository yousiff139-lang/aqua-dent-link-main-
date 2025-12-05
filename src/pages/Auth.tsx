import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Mail, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { isNetworkError, getUserFriendlyErrorMessage } from "@/lib/error-handling";
import GoogleIcon from "@/components/icons/GoogleIcon";

const emailAuthSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password too long"),
  // Optional in sign-in; required in sign-up flow only
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Only enforce confirm password when present (sign-up mode)
  if (data.confirmPassword === undefined) return true;
  return data.password === data.confirmPassword;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const isAdmin = isAdminEmail(user.email);
      console.log('[Auth] User already logged in:', {
        email: user.email,
        isAdmin,
        redirectTo: isAdmin ? '/admin' : '/dashboard'
      });
      navigate(isAdmin ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  // Handle email verification callback
  useEffect(() => {
    const handleAuthStateChange = async () => {
      console.log('[Auth] Checking auth state on mount...');

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Error getting session:', error);
        return;
      }

      if (session?.user) {
        const isAdmin = isAdminEmail(session.user.email);
        console.log('[Auth] Session found after verification:', {
          email: session.user.email,
          isAdmin,
          emailConfirmed: session.user.email_confirmed_at
        });

        // User just verified their email, redirect them
        if (session.user.email_confirmed_at) {
          const redirectPath = isAdmin ? '/admin' : '/dashboard';
          console.log('[Auth] Email verified, redirecting to:', redirectPath);

          toast({
            title: isAdmin ? "Admin Account Verified!" : "Email Verified!",
            description: "Your account is now active. Welcome!",
          });

          navigate(redirectPath, { replace: true });
        }
      }
    };

    handleAuthStateChange();
  }, [navigate, toast]);

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      console.log('[Auth] Starting Google OAuth sign-in...');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[Auth] Google OAuth error:', error);

        if (isNetworkError(error)) {
          toast({
            title: "Connection Error",
            description: "No internet connection. Please check your network and try again.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "Sign-In Error",
            description: error.message || "Failed to sign in with Google. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      console.log('[Auth] Google OAuth initiated:', data);
      // The redirect will happen automatically

    } catch (error: any) {
      console.error('[Auth] Unexpected Google OAuth error:', error);
      toast({
        title: "Sign-In Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = (formData.get('firstName') as string) || undefined;
    const lastName = (formData.get('lastName') as string) || undefined;
    const confirmPassword = (formData.get('confirmPassword') as string) || undefined;

    // Validate input
    const result = emailAuthSchema.safeParse({ email, password, firstName, lastName, confirmPassword: isSignUp ? confirmPassword : undefined });
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign up
        const fullName = [result.data.firstName, result.data.lastName].filter(Boolean).join(' ').trim() || undefined;
        const { data, error } = await supabase.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              first_name: result.data.firstName,
              last_name: result.data.lastName,
              full_name: fullName,
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          const isAdmin = isAdminEmail(data.user.email);
          console.log('[Auth] Sign up response:', {
            email: data.user.email,
            isAdmin,
            user: data.user,
            session: data.session,
            identities: data.user.identities,
            emailConfirmed: data.user.email_confirmed_at
          });

          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            // User already exists
            console.log('[Auth] User already exists:', data.user.email);
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
            setIsSignUp(false);
          } else if (data.session) {
            // Auto-confirmed (email confirmation disabled in Supabase settings)
            const redirectPath = isAdmin ? '/admin' : '/dashboard';
            console.log('[Auth] Auto-confirmed, redirecting to:', redirectPath);

            if (isAdmin) {
              toast({
                title: "Admin Account Created!",
                description: "Welcome to the admin dashboard. Redirecting...",
              });
            } else {
              toast({
                title: "Success!",
                description: "Account created successfully! Redirecting...",
              });
            }

            navigate(redirectPath, { replace: true });
          } else {
            // Email confirmation required
            console.log('[Auth] Email confirmation required for:', data.user.email, 'isAdmin:', isAdmin);

            if (isAdmin) {
              toast({
                title: "✉️ Admin Account - Verify Your Email",
                description: `We sent a verification link to ${data.user.email}. Please check your inbox (and spam folder) and click the link to activate your admin account.`,
                duration: 10000,
              });
            } else {
              toast({
                title: "✉️ Verify Your Email",
                description: `We sent a verification link to ${data.user.email}. Please check your inbox (and spam folder) and click the link to activate your account.`,
                duration: 10000,
              });
            }

            setShowVerificationBanner(true);
            setIsSignUp(false);
          }
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        });

        if (error) {
          // Check for network errors first
          if (isNetworkError(error)) {
            toast({
              title: "Connection Error",
              description: "No internet connection. Please check your network and try again.",
              variant: "destructive",
              duration: 8000,
            });
          } else if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Sign In Failed",
              description: "Invalid email or password. Please check your credentials and try again.",
              variant: "destructive",
              duration: 6000,
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: "Email Not Verified",
              description: "Please check your email inbox and click the verification link before signing in.",
              variant: "destructive",
              duration: 8000,
            });
          } else if (error.message.includes('Email link is invalid or has expired')) {
            toast({
              title: "Verification Link Expired",
              description: "Your verification link has expired. Please sign up again or contact support.",
              variant: "destructive",
              duration: 8000,
            });
          } else {
            // Use the error handling utility for other errors
            const userMessage = getUserFriendlyErrorMessage(error, 'sign in');
            toast({
              title: "Sign In Error",
              description: userMessage,
              variant: "destructive",
              duration: 6000,
            });
          }
          throw error;
        }

        if (data?.user) {
          const isAdmin = isAdminEmail(data.user.email);

          console.log('[Auth] Sign in successful:', {
            email: data.user.email,
            isAdmin,
            userId: data.user.id,
            emailConfirmed: data.user.email_confirmed_at
          });

          // Check user role and redirect accordingly
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();

          console.log('[Auth] User role check:', {
            role: roleData?.role,
            error: roleError,
            isAdmin
          });

          let redirectPath = '/dashboard';
          let welcomeMessage = 'Welcome back!';

          if (isAdmin) {
            redirectPath = '/admin';
            welcomeMessage = 'Welcome back, Admin!';
          } else if (roleData?.role === 'dentist') {
            redirectPath = '/dentist-portal';
            welcomeMessage = 'Welcome back, Doctor!';
          }

          console.log('[Auth] Redirecting to:', redirectPath);

          toast({
            title: "Success!",
            description: welcomeMessage,
          });

          navigate(redirectPath, { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Email auth error:', error);

      // Only show additional error toast if we haven't already shown one
      if (!error.message?.includes('Invalid login') &&
        !error.message?.includes('Email not confirmed') &&
        !isNetworkError(error)) {
        const userMessage = getUserFriendlyErrorMessage(error, isSignUp ? 'sign up' : 'sign in');
        toast({
          title: isSignUp ? "Sign Up Error" : "Sign In Error",
          description: userMessage,
          variant: "destructive",
          duration: 6000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "✉️ Check Your Email",
        description: `We sent a password reset link to ${resetEmail}. Please check your inbox and click the link to reset your password.`,
        duration: 10000,
      });

      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      console.error('Password reset error:', error);
      const userMessage = isNetworkError(error)
        ? "No internet connection. Please check your network and try again."
        : getUserFriendlyErrorMessage(error, 'password reset');

      toast({
        title: isNetworkError(error) ? "Connection Error" : "Error",
        description: userMessage,
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <NetworkStatusIndicator />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(190,100%,50%,0.1),transparent_50%)]" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-smooth mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="p-8 shadow-aqua-lg gradient-card border-border/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">DentalCare Connect</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in or create your account</p>
          </div>

          <div className="w-full">
            {showForgotPassword ? (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-4 p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Button>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email Address</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      maxLength={255}
                      className="transition-smooth focus:shadow-aqua-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </div>
            ) : (
              <>
                {showVerificationBanner && !isSignUp && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                      ✉️ Check Your Email
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      We sent you a verification link. Click it to activate your account, then sign in here.
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      💡 Tip: Check your spam folder if you don't see the email
                    </p>
                  </div>
                )}

                {/* Google Sign-In Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                  ) : (
                    <GoogleIcon className="mr-3" size={22} />
                  )}
                  Continue with Google
                </Button>

                {/* OR Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          placeholder="John"
                          maxLength={100}
                          className="transition-smooth focus:shadow-aqua-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          placeholder="Doe"
                          maxLength={100}
                          className="transition-smooth focus:shadow-aqua-sm"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                      className="transition-smooth focus:shadow-aqua-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      maxLength={100}
                      className="transition-smooth focus:shadow-aqua-sm"
                    />
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={8}
                        maxLength={100}
                        className="transition-smooth focus:shadow-aqua-sm"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
                  </Button>

                  {!isSignUp && (
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                      disabled={isLoading}
                    >
                      Forgot your password?
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={isLoading}
                  >
                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
