import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const Fireworks = ({ play, className }: { play: boolean; className?: string }) => {
    const [isPlaying, setIsPlaying] = useState(play);

    useEffect(() => {
        if (play) {
            setIsPlaying(true);
            const timer = setTimeout(() => {
                setIsPlaying(false);
            }, 5000); // 5 seconds is a complete cycle of the fireworks gif
            return () => clearTimeout(timer);
        }
    }, [play]);

    if (!isPlaying) {
        return null;
    }
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="flex place-content-center pt-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/fireworks.gif" alt="fireworks" className={cn("max-w-full md:max-w-[600px]", className)} />
            </div>
        </div>
    );
};
