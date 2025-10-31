import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdminEmail } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/Toaster'
import { Lock } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // Check if already logged in
  useEffect(() => {
    const loggedInEmail = localStorage.getItem('admin_email')
    if (loggedInEmail && isAdminEmail(loggedInEmail)) {
      navigate('/dashboard')
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simple email check - if it matches admin list, let them in
      if (isAdminEmail(email)) {
        // Store email in localStorage to maintain session
        localStorage.setItem('admin_email', email)
        
        toast({
          title: 'Welcome!',
          description: 'Access granted.',
        })
        
        navigate('/dashboard')
      } else {
        toast({
          title: 'Access Denied',
          description: 'This email is not authorized.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dental Admin Portal</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to manage your dentist profile
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your authorized admin email to access the portal
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Checking...' : 'Access Portal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
