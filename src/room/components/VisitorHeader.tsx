import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";

interface VisitorHeaderProps {
    ownerName: string;
    visitorCount: number;
}

export function VisitorHeader({ ownerName, visitorCount }: VisitorHeaderProps) {
    return (
        <>
            <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border-2 border-[var(--ink)] min-w-[140px]">
                    <div className="flex items-start justify-between">
                        <div className="text-sm text-[var(--ink-subtle)] uppercase tracking-wide text-xs">Visiting</div>
                        {visitorCount > 1 && (
                            <div className="flex items-center gap-1 -mt-0.5 -mr-1">
                                <Users className="h-3.5 w-3.5 text-[var(--ink)]" />
                                <span className="text-sm font-bold text-[var(--ink)]">{visitorCount}</span>
                            </div>
                        )}
                    </div>
                    <div className="font-bold text-lg text-[var(--ink)]">{ownerName}'s Room</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                <Link to="/">
                    <Button variant="outline" className="bg-[var(--paper)] backdrop-blur-sm shadow-md">
                        <Home className="mr-2 h-4 w-4" />
                        My Room
                    </Button>
                </Link>
            </div>
        </>
    );
}
