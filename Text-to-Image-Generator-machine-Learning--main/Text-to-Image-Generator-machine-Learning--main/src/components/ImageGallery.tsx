import { useEffect, useState } from 'react';
import { ImageGeneration, supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

interface ImageGalleryProps {
  refreshTrigger: number;
}

export function ImageGallery({ refreshTrigger }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, [refreshTrigger]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('image_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      setImages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No images generated yet. Create your first one above!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {images.map((image) => (
        <div
          key={image.id}
          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
        >
          <div className="aspect-square bg-gray-100 relative">
            {image.status === 'pending' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Generating...</p>
                </div>
              </div>
            )}
            {image.status === 'failed' && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600">Failed to generate</p>
                  {image.error_message && (
                    <p className="text-xs text-gray-500 mt-1">{image.error_message}</p>
                  )}
                </div>
              </div>
            )}
            {image.status === 'completed' && image.image_url && (
              <img
                src={image.image_url}
                alt={image.prompt}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-700 line-clamp-2">{image.prompt}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(image.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
