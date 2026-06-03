import { MapPinnedIcon } from "lucide-react";
import { ComponentProps, FC } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger,
} from "@/components/shadcn/sidebar";
import { getMenuDefs } from "@/components/sidebar/menus.tsx";
import { NavMenu } from "@/components/sidebar/nav.menu.tsx";

type Props = ComponentProps<typeof Sidebar>;

export const AppSidebar: FC<Props> = ({ ...props }) => {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
                <div className="flex items-center gap-3 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <MapPinnedIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                        <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                            犊牛岛投喂车
                        </span>
                        <span className="block truncate text-xs text-sidebar-foreground/60">
                            管理端 1.0
                        </span>
                    </span>
                    <SidebarTrigger
                        className="ml-auto h-8 w-8 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden"
                        title="收起侧边栏"
                    />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMenu menus={getMenuDefs()} />
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
};
