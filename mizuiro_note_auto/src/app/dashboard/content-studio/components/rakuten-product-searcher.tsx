'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ShoppingCart, ShoppingBag } from 'lucide-react';
import { searchRakutenProducts, type RakutenProduct } from '@/ai/flows/search-rakuten-products';
import { searchAmazonProducts } from '@/ai/flows/search-amazon-products';
import { Badge } from '@/components/ui/badge';

const searchFormSchema = z.object({
  keyword: z.string().min(1, '検索キーワードを入力してください。'),
});

interface ProductSearcherProps {
  onProductSelect: (product: RakutenProduct) => void;
  externalKeyword?: string;
}

export default function ProductSearcher({ onProductSelect, externalKeyword }: ProductSearcherProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<RakutenProduct[]>([]);
  const [searchSource, setSearchSource] = useState<'rakuten' | 'amazon'>('rakuten');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const form = useForm<z.infer<typeof searchFormSchema>>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      keyword: '',
    },
  });

  // Sync with external keyword (from Trend Analyzer) - 上書きではなく追加する
  useEffect(() => {
    if (externalKeyword) {
      const current = form.getValues('keyword').trim();
      // 既に同じキーワードが含まれていれば追加しない
      const existingKeywords = current.split(/\s+/).filter(Boolean);
      if (!existingKeywords.includes(externalKeyword.trim())) {
        const newValue = current ? `${current} ${externalKeyword.trim()}` : externalKeyword.trim();
        form.setValue('keyword', newValue);
      }
    }
  }, [externalKeyword, form]);

  async function onSubmit(values: z.infer<typeof searchFormSchema>) {
    setIsLoading(true);
    setSearchResults([]);

    try {
      let result;
      if (searchSource === 'rakuten') {
        result = await searchRakutenProducts({
          affiliateId: userData.rakutenAffiliateId || '',
          keyword: values.keyword,
        });
      } else {
        result = await searchAmazonProducts({
          accessKey: userData.amazonAccessKey || '',
          secretKey: userData.amazonSecretKey || '',
          associateTag: userData.amazonAssociateTag || '',
          keyword: values.keyword,
        });
      }
      
      setSearchResults(result.products);
      if (result.products.length === 0) {
        toast({
            title: '検索結果が見つかりませんでした',
            description: '別のキーワードで試してみてください。'
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '検索エラー',
        description: error.message || `${searchSource === 'rakuten' ? '楽天' : 'Amazon'}の商品検索中に不明なエラーが発生しました。`,
      });
      console.error(`Failed to search ${searchSource} products`, error);
    } finally {
      setIsLoading(false);
    }
  }

  const renderContent = () => {
    if (isUserDataLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">ユーザー情報を読み込み中...</p>
        </div>
      );
    }

    return (
      <>
        <Tabs value={searchSource} onValueChange={(v) => setSearchSource(v as any)} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rakuten">
              <ShoppingCart className="w-4 h-4 mr-2" /> 楽天市場
            </TabsTrigger>
            <TabsTrigger value="amazon">
              <ShoppingBag className="w-4 h-4 mr-2" /> Amazon
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <FormField
              control={form.control}
              name="keyword"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="検索キーワード (例: 'ワイヤレスイヤホン')" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              検索
            </Button>
          </form>
        </Form>
        
        {isLoading && (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                <p className="ml-4 text-muted-foreground">{searchSource === 'rakuten' ? '楽天' : 'Amazon'}から商品を検索中...</p>
            </div>
        )}

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {searchResults.map((product, index) => (
              <Card key={index} className="flex flex-col overflow-hidden bg-background/50">
                <CardHeader className="p-0">
                  <div className="relative w-full aspect-square">
                    <Image
                      src={product.imageUrl}
                      alt={product.itemName}
                      fill
                      className="object-cover"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <h3 className="font-semibold text-sm leading-tight h-10 overflow-hidden">
                    {product.itemName}
                  </h3>
                  <Badge variant="secondary" className="mt-2">
                    ¥{product.itemPrice.toLocaleString()}
                  </Badge>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full" onClick={() => onProductSelect(product)}>
                    この商品を選択
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <Card id="product-searcher" className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-6 w-6" /> 商品検索
        </CardTitle>
        <CardDescription>
          キーワードで楽天・Amazonの商品を検索し、投稿の元になる商品を選択します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
