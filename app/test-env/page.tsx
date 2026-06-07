export default function TestEnv() { return <div><p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "UNDEFINED"}</p><p>KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "OK" : "UNDEFINED"}</p></div> }
