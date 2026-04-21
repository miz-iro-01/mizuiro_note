'use client';

import { useState, useEffect } from 'react';
import PostGenerator from "./components/post-generator"
import RakutenProductSearcher from "./components/rakuten-product-searcher"
import TrendAnalyzer from "./components/trend-analyzer"
import { type RakutenProduct } from '@/ai/flows/search-rakuten-products';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const ADMIN_EMAILS = ['oumaumauma32@gmail.com', 'sl0wmugi9@gmail.com'];

export default function ContentStudioPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(firestore, 'users', user.uid) : null
  }, [firestore, user])
  
  const { data: userData } = useDoc(userDocRef)

  const [activeSlot, setActiveSlot] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<RakutenProduct | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // マウント時に現在のスロットのデータを復元
  useEffect(() => {
    const slotKey = `mizuiro_slot_${activeSlot}`;
    const savedData = localStorage.getItem(slotKey);
    if (savedData) {
      try {
        const { product, keyword } = JSON.parse(savedData);
        setSelectedProduct(product || null);
        setSearchKeyword(keyword || '');
      } catch (e) {
        console.error('Failed to parse slot data', e);
      }
    } else {
      setSelectedProduct(null);
      setSearchKeyword('');
    }
  }, [activeSlot]);

  // データ保存
  const saveSlotData = (product: RakutenProduct | null, keyword: string) => {
    const slotKey = `mizuiro_slot_${activeSlot}`;
    localStorage.setItem(slotKey, JSON.stringify({ product, keyword }));
    // 互換性のためのメインキーも更新（スロット1のみ）
    if (activeSlot === 1) {
      if (product) sessionStorage.setItem('mizuiro_selected_product', JSON.stringify(product));
      sessionStorage.setItem('mizuiro_search_keyword', keyword);
    }
  };

  const handleProductSelect = (product: RakutenProduct) => {
    setSelectedProduct(product);
    saveSlotData(product, searchKeyword);
    setTimeout(() => {
      const postGeneratorElement = document.getElementById('post-generator');
      if (postGeneratorElement) {
        postGeneratorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleKeywordSelect = (keyword: string) => {
    setSearchKeyword(keyword);
    saveSlotData(selectedProduct, keyword);
    const searcherElement = document.getElementById('rakuten-product-searcher');
    if (searcherElement) {
      searcherElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSlotClear = () => {
    if (window.confirm(`スロット${activeSlot}の作業内容をリセットしますか？`)) {
      setSelectedProduct(null);
      setSearchKeyword('');
      localStorage.removeItem(`mizuiro_slot_${activeSlot}`);
      localStorage.removeItem(`mizuiro_generated_blog_slot_${activeSlot}`);
      localStorage.removeItem(`mizuiro_generated_post_slot_${activeSlot}`);
      localStorage.removeItem(`mizuiro_generation_payload_slot_${activeSlot}`);
      window.location.reload(); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
        <div className="flex gap-2">
          {[1, 2, 3].map((slot) => (
            <Button
              key={slot}
              variant={activeSlot === slot ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (slot > 1) {
                  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
                  const isPro = isAdmin || userData?.plan === 'pro';
                  if (!isPro) {
                    toast({
                      title: 'Proプラン限定機能',
                      description: '複数スロットの利用にはアップグレードが必要です。',
                      variant: 'destructive'
                    });
                    return;
                  }
                }
                setActiveSlot(slot);
              }}
              className="gap-2 px-6"
            >
              スタジオ {slot}
              {slot > 1 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded leading-none font-bold">PRO</span>}
            </Button>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSlotClear}
          className="text-muted-foreground hover:text-destructive gap-2 border-none"
        >
          <RotateCcw className="h-4 w-4" />
          このスタジオをリセット
        </Button>
      </div>

      <div className="grid auto-rows-max grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <RakutenProductSearcher onProductSelect={handleProductSelect} externalKeyword={searchKeyword} />
          <PostGenerator selectedProduct={selectedProduct} slotId={activeSlot} />
        </div>
        <div className="lg:col-span-1">
          <TrendAnalyzer onKeywordSelect={handleKeywordSelect} />
        </div>
      </div>
    </div>
  )
}
