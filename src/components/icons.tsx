import { cn } from "@/lib/utils"
import Image from "next/image"

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/20 bg-primary/5 p-1 shadow-inner">
        <Image 
          src="/logo.png" 
          alt="MIZUIRO Logo" 
          fill 
          className="object-contain"
        />
      </div>
      <span className="text-xl font-black tracking-tighter text-primary">
        MIZUIRO
      </span>
    </div>
  )
}
