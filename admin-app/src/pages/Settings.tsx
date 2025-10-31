import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/Toaster'
import { 
  User, Building2, Bell, Brain, Palette, Shield, 
  Calendar, Clock, Phone, Download,
  Trash2, LogOut, Save, Check
} from 'lucide-react'

interface AppearanceSettings {
  accentColor: string
  fontSize: 'small' | 'medium' | 'large'
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account')
  
  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    accentColor: 'blue',
    fontSize: 'medium'
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appearanceSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setAppearanceSettings(parsed)
      applySettings(parsed)
    }
  }, [])

  // Apply settings to the document
  const applySettings = (settings: AppearanceSettings) => {
    const root = document.documentElement
    
    // Apply accent color
    root.style.setProperty('--accent-color', getColorValue(settings.accentColor))
    
    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.setProperty('--base-font-size', fontSizes[settings.fontSize])
  }

  // Get CSS color value from color name
  const getColorValue = (colorName: string): string => {
    const colors: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      pink: '#ec4899',
      orange: '#f97316',
      red: '#ef4444',
      teal: '#14b8a6',
      indigo: '#6366f1'
    }
    return colors[colorName] || colors.blue
  }

  // Save appearance settings
  const saveAppearanceSettings = () => {
    localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings))
    applySettings(appearanceSettings)
    toast({
      title: 'Appearance Updated',
      description: 'Your appearance settings have been saved successfully.',
    })
  }

  // Update individual appearance setting
  const updateAppearanceSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setAppearanceSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your settings have been updated successfully.',
    })
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'clinic', label: 'Clinic', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI & Data', icon: Brain },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences and clinic settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Account & Profile Settings */}
        {activeTab === 'account' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Account & Profile</CardTitle>
              <CardDescription>Manage your personal account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Change Password</Label>
                <Input id="current-password" type="password" placeholder="Current password" />
                <Input id="new-password" type="password" placeholder="New password" />
                <Input id="confirm-password" type="password" placeholder="Confirm new password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Profile Visibility</Label>
                <select id="visibility" defaultValue="public" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="public">Public (visible on user site)</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select id="language" defaultValue="en" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" defaultValue="utc" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="utc">UTC</option>
                    <option value="est">EST (Eastern)</option>
                    <option value="pst">PST (Pacific)</option>
                    <option value="gmt">GMT (London)</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Account Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Clinic & Availability Settings */}
        {activeTab === 'clinic' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Clinic & Availability</CardTitle>
              <CardDescription>Configure your working hours and appointment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Working Hours</Label>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28 font-medium text-sm">{day}</div>
                    <Input placeholder="09:00" className="w-24" />
                    <span className="text-gray-400">to</span>
                    <Input placeholder="17:00" className="w-24" />
                    <input type="checkbox" defaultChecked={day !== 'Sunday'} className="w-5 h-5" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="break-times">Break Times</Label>
                <Input id="break-times" placeholder="e.g., 12:00-13:00" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment-duration">Default Appointment Duration</Label>
                  <select id="appointment-duration" defaultValue="30" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-appointments">Max Daily Appointments</Label>
                  <Input id="max-appointments" type="number" defaultValue="12" />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Clinic Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Communication & Notifications */}
        {activeTab === 'notifications' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Communication & Notifications</CardTitle>
              <CardDescription>Control how you receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>

                <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New patient booked</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Appointment cancelled</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Patient uploaded new scan</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Communication Channel</Label>
                <select defaultValue="email" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="in-app">In-App Only</option>
                </select>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* AI & Data Settings */}
        {activeTab === 'ai' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>AI & Data Settings</CardTitle>
              <CardDescription>Configure AI access and data management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Access Permissions</Label>
                <select defaultValue="full" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="scans">Scans Only</option>
                  <option value="full">Full Patient Records</option>
                  <option value="limited">Limited (No Personal Info)</option>
                  <option value="none">No AI Access</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>AI Language Output Style</Label>
                <select defaultValue="detailed" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download My Data
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report History
                </Button>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save AI & Data Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Interface & Theme</CardTitle>
              <CardDescription>Customize your dashboard appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Accent Color Picker */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Accent Color</Label>
                <p className="text-sm text-gray-500">Choose your preferred accent color</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: 'blue', label: 'Blue', color: 'bg-blue-500' },
                    { name: 'green', label: 'Green', color: 'bg-green-500' },
                    { name: 'purple', label: 'Purple', color: 'bg-purple-500' },
                    { name: 'pink', label: 'Pink', color: 'bg-pink-500' },
                    { name: 'orange', label: 'Orange', color: 'bg-orange-500' },
                    { name: 'red', label: 'Red', color: 'bg-red-500' },
                    { name: 'teal', label: 'Teal', color: 'bg-teal-500' },
                    { name: 'indigo', label: 'Indigo', color: 'bg-indigo-500' }
                  ].map((colorOption) => (
                    <button
                      key={colorOption.name}
                      onClick={() => updateAppearanceSetting('accentColor', colorOption.name)}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        appearanceSettings.accentColor === colorOption.name
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full ${colorOption.color} shadow-md flex items-center justify-center`}>
                        {appearanceSettings.accentColor === colorOption.name && (
                          <Check className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <span className="text-xs font-medium">{colorOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Font Size</Label>
                <p className="text-sm text-gray-500">Adjust text size for better readability</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'small', label: 'Small', example: 'Aa' },
                    { value: 'medium', label: 'Medium', example: 'Aa' },
                    { value: 'large', label: 'Large', example: 'Aa' }
                  ].map((sizeOption) => (
                    <button
                      key={sizeOption.value}
                      onClick={() => updateAppearanceSetting('fontSize', sizeOption.value as 'small' | 'medium' | 'large')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        appearanceSettings.fontSize === sizeOption.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          sizeOption.value === 'small' ? 'text-2xl' : 
                          sizeOption.value === 'medium' ? 'text-3xl' : 
                          'text-4xl'
                        }`}
                      >
                        {sizeOption.example}
                      </span>
                      <span className="text-sm font-medium">{sizeOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Section */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Preview</Label>
                <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: getColorValue(appearanceSettings.accentColor) }}
                    >
                      A
                    </div>
                    <div>
                      <p className="font-semibold" style={{ fontSize: appearanceSettings.fontSize === 'small' ? '14px' : appearanceSettings.fontSize === 'large' ? '18px' : '16px' }}>
                        Sample Heading
                      </p>
                      <p className="text-gray-500 text-sm">This is how your text will look</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    style={{ backgroundColor: getColorValue(appearanceSettings.accentColor) }}
                  >
                    Sample Button
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={saveAppearanceSettings} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Appearance Settings
              </Button>

              {/* Reset Button */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setAppearanceSettings({
                    accentColor: 'blue',
                    fontSize: 'medium'
                  })
                  toast({
                    title: 'Settings Reset',
                    description: 'Appearance settings have been reset to defaults.',
                  })
                }}
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security & Privacy */}
        {activeTab === 'security' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Security & Privacy</CardTitle>
              <CardDescription>Manage your account security and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <select defaultValue="30" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout from All Devices
                </Button>

                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
