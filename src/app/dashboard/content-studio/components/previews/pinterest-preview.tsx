import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Pin } from 'lucide-react';

interface PinterestPreviewProps {
  imageUrl: string;
  title: string;
  description: string;
}

export default function PinterestPreview({ imageUrl, title, description }: PinterestPreviewProps) {
  return (
    <div className="flex justify-center p-8 bg-muted/20 rounded-xl">
      <Card className="w-[300px] overflow-hidden rounded-3xl border-none shadow-2xl bg-white text-black">
        <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden group cursor-zoom-in">
          <Image 
            src={imageUrl} 
            alt={title} 
            fill 
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg">
            <Pin className="h-5 w-5 fill-white" />
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-bold text-xl leading-tight">
            {title}
          </h3>
          <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
            {description}
          </p>
          <div className="flex items-center gap-2 pt-2">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-xs">M</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">MIZUIRO User</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
