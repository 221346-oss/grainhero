import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, company, phone, message } = body;

        // Validate required fields
        if (!name || !email || !message) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, message: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Forward to backend API
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                company,
                phone,
                inquiry: 'custom_solution', // Default inquiry type for contact form
                message,
                subscribe: false
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: result.message || 'Failed to submit contact form' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Contact form submitted successfully. We will get back to you within 24 hours.'
        });

    } catch (error) {
        console.error('Contact API error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
