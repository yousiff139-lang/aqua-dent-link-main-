export default function Test() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Admin App is Working!</h1>
        <div className="space-y-2 text-sm">
          <p><strong>Environment Variables:</strong></p>
          <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
        <div className="mt-6">
          <a href="/login" className="text-blue-600 hover:underline">Go to Login →</a>
        </div>
      </div>
    </div>
  )
}
