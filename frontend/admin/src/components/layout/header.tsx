import { cn } from "@helpers/lib/cn.ts";
import { FC, HTMLAttributes, Ref } from "react";
import { useWindowScroll } from "react-use";
import { SidebarTrigger } from "@/components/shadcn/sidebar.tsx";

interface HeaderProps extends HTMLAttributes<HTMLElement> {
    fixed?: boolean;
    ref?: Ref<HTMLElement>;
}

export const Header: FC<HeaderProps> = ({ className, fixed, children, ...props }) => {
    const { y: offset } = useWindowScroll();

    return (
        <header
            className={cn(
                "flex h-16 items-center gap-4 border-b border-[#d8dee6] bg-white px-5",
                fixed && "fixed-header peer/header fixed z-10 w-[inherit]",
                offset > 10 && fixed ? "shadow-[0_2px_10px_rgb(24_34_48/8%)]" : "shadow-none",
                className,
            )}
            {...props}
        >
            <SidebarTrigger />
            <div className="hidden min-w-0 md:block">
                <div className="truncate text-sm font-semibold text-[#182230]">管理工作台</div>
                <div className="truncate text-xs text-[#687589]">
                    路径规划、投喂任务、视频识别统一管理
                </div>
            </div>
            {children}
        </header>
    );
};

Header.displayName = "Header";
