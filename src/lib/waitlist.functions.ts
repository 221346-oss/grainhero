import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        email: z.string().email("Please enter a valid email address"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);

    const { error } = await supabase
      .from("waitlist_emails")
      .insert({ email: data.email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        return {
          success: true,
          message: "You're already on the waitlist!",
        };
      }
      throw new Error("Failed to join waitlist. Please try again.");
    }

    return {
      success: true,
      message: "Thanks! We'll notify you when we launch.",
    };
  });
