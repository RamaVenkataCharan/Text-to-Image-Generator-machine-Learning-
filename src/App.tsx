import { useState } from 'react';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageGallery } from './components/ImageGallery';
import { Sparkles } from 'lucide-react';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImageGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              AI Image Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Transform your ideas into stunning visuals using advanced machine learning
          </p>
        </header>

        <div className="space-y-12">
          <section>
            <ImageGenerator onImageGenerated={handleImageGenerated} />
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Generations</h2>
            <ImageGallery refreshTrigger={refreshTrigger} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
