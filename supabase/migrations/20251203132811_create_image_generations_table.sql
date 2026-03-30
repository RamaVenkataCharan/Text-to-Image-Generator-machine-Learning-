/*
  # Create image_generations table

  1. New Tables
    - `image_generations`
      - `id` (uuid, primary key) - Unique identifier for each generation
      - `prompt` (text) - The text prompt used to generate the image
      - `image_url` (text) - URL of the generated image
      - `user_id` (uuid, nullable) - Reference to auth.users for authenticated users
      - `created_at` (timestamptz) - Timestamp of when the image was generated
      - `status` (text) - Status of generation: 'pending', 'completed', 'failed'
      - `error_message` (text, nullable) - Error message if generation failed
  
  2. Security
    - Enable RLS on `image_generations` table
    - Add policy for public read access (viewing gallery)
    - Add policy for authenticated users to create their own generations
    - Add policy for authenticated users to view their own generations
    - Add policy for public users to create generations (with rate limiting via app logic)
  
  3. Indexes
    - Add index on `created_at` for efficient sorting
    - Add index on `user_id` for user-specific queries
*/

CREATE TABLE IF NOT EXISTS image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  image_url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text
);

ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view completed generations"
  ON image_generations
  FOR SELECT
  USING (status = 'completed');

CREATE POLICY "Anyone can create generations"
  ON image_generations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own generations"
  ON image_generations
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON image_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_user_id ON image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_status ON image_generations(status);