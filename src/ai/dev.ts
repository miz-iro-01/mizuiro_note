import { config } from 'dotenv';
config();

// AI機能はリクエストごとにAPIキーを使用して初期化されるため、ここではフローをインポートしません。
import '@/ai/flows/search-rakuten-products.ts';
