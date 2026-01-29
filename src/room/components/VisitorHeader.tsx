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
                <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border-2 border-[var(--ink)]">
                    <div className="text-sm text-[var(--ink-subtle)] uppercase tracking-wide text-xs">Visiting</div>
                    <div className="font-bold text-lg text-[var(--ink)]">{ownerName}'s Room</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {visitorCount > 1 && (
                    <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border-2 border-[var(--ink)] flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--ink)]" />
                        <span className="font-bold text-[var(--ink)]">{visitorCount}</span>
                    </div>
                )}
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
