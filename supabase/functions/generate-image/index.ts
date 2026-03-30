import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateImageRequest {
  prompt: string;
  generationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { prompt, generationId }: GenerateImageRequest = await req.json();

    if (!prompt || !generationId) {
      return new Response(
        JSON.stringify({ error: "Missing prompt or generationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const huggingFaceToken = Deno.env.get("HUGGING_FACE_TOKEN");
    
    if (!huggingFaceToken) {
      await supabase
        .from("image_generations")
        .update({
          status: "failed",
          error_message: "Hugging Face API token not configured",
        })
        .eq("id", generationId);

      return new Response(
        JSON.stringify({ 
          error: "Hugging Face API token not configured. Please add your HUGGING_FACE_TOKEN to environment variables.",
          message: "To get a token: 1) Sign up at https://huggingface.co 2) Go to Settings > Access Tokens 3) Create a new token"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingFaceToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to generate image";
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      await supabase
        .from("image_generations")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", generationId);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const fileName = `${generationId}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(fileName, uint8Array, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      await supabase
        .from("image_generations")
        .update({
          status: "failed",
          error_message: `Storage error: ${uploadError.message}`,
        })
        .eq("id", generationId);

      return new Response(
        JSON.stringify({ error: `Failed to upload image: ${uploadError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: urlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(fileName);

    await supabase
      .from("image_generations")
      .update({
        status: "completed",
        image_url: urlData.publicUrl,
      })
      .eq("id", generationId);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        generationId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});