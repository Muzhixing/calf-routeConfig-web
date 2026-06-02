import { ArrowRightLeftIcon, LockIcon, UserRoundCheckIcon, UsersIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { overviewsStore } from "@/adm/overview/overviews.store.ts";
import { LayoutContent } from "@/components/layout/layout.content.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { OverviewAreaChart } from "@/pages/dashboard/overview.area.chart.tsx";
import { OverviewBarChart } from "@/pages/dashboard/overview.bar.chart.tsx";
import { OverviewLineChat } from "@/pages/dashboard/overview.line.chart.tsx";

const DashboardComponent: FC = observer(() => {
    const { t } = useTranslation();

    useEffect(() => void overviewsStore.load(), []);

    const cards = [
        {
            icon: <ArrowRightLeftIcon />,
            title: t("overview.apiCalled"),
            value: overviewsStore.apiGet + overviewsStore.apiPost,
        },
        {
            icon: <UsersIcon />,
            title: t("overview.userCreated"),
            value: overviewsStore.userCreated,
        },
        {
            icon: <UserRoundCheckIcon />,
            title: t("overview.roleCreated"),
            value: overviewsStore.roleCreated,
        },
        {
            icon: <LockIcon />,
            title: t("overview.permissionCreated"),
            value: overviewsStore.permissionCreated,
        },
    ];

    return (
        <div className="flex-1 space-y-5 bg-[#f5f7f8] p-4 md:px-6">
            <div>
                <h1 className="text-lg font-semibold text-[#182230]">运行概览</h1>
                <p className="mt-1 text-sm text-[#687589]">查看管理端基础数据与系统访问趋势。</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((x) => (
                    <Card key={x.title} className="h-full rounded-md border-[#d8dee6] shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-[#4d5b6f]">
                                {x.title}
                            </CardTitle>
                            <span className="text-[#0f766e] [&>svg]:h-4 [&>svg]:w-4">{x.icon}</span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-[#182230]">{x.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[
                    <OverviewAreaChart chartData={overviewsStore.apiData} />,
                    <OverviewBarChart chartData={overviewsStore.userData} />,
                    <OverviewLineChat chartData={overviewsStore.roleData} />,
                    <OverviewLineChat chartData={overviewsStore.permissionData} />,
                ].map((x, index) => (
                    <div key={index} className="col-span-2">
                        {x}
                    </div>
                ))}
            </div>
        </div>
    );
});

export const DashboardPage: FC = () => {
    return (
        <LayoutContent>
            <DashboardComponent />
        </LayoutContent>
    );
};
