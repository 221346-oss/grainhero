export const config = {
    backendUrl:
        (typeof window !== 'undefined' ? (window as typeof window & Record<string, unknown>).__BACKEND_URL as string | undefined : undefined) ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:5000",
}









