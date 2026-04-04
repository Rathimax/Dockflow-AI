import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid"
import {
    CheckCircle,
    Clock,
    Star,
    TrendingUp,
    Video,
    Globe,
} from "lucide-react";

/**
 * Sample items for the BentoGrid component.
 * Each item can have a different colSpan and a persistent hover state.
 */
const itemsSample: BentoItem[] = [
    {
        title: "Analytics Dashboard",
        meta: "v2.4.1",
        description:
            "Real-time metrics with AI-powered insights and predictive analytics",
        icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
        status: "Live",
        tags: ["Statistics", "Reports", "AI"],
        colSpan: 2,
        hasPersistentHover: true,
    },
    {
        title: "Task Manager",
        meta: "84 completed",
        description: "Automated workflow management with priority scheduling",
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        status: "Updated",
        tags: ["Productivity", "Automation"],
    },
    {
        title: "Media Library",
        meta: "12GB used",
        description: "Cloud storage with intelligent content processing",
        icon: <Video className="w-4 h-4 text-purple-500" />,
        tags: ["Storage", "CDN"],
        colSpan: 2,
    },
    {
        title: "Global Network",
        meta: "6 regions",
        description: "Multi-region deployment with edge computing",
        icon: <Globe className="w-4 h-4 text-sky-500" />,
        status: "Beta",
        tags: ["Infrastructure", "Edge"],
    },
];

/**
 * BentoGridDemo component that renders the BentoGrid with sample data.
 */
function BentoGridDemo() {
    return (
        <div className="py-20">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight">Bento Grid Component</h2>
                <p className="text-muted-foreground mt-2 text-lg">
                    A premium, responsive grid layout for displaying features or data.
                </p>
            </div>
            <BentoGrid items={itemsSample} />
        </div>
    );
}

export { BentoGridDemo }
