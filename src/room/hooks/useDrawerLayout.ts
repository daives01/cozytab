import { useMemo } from "react";
import { ASSET_DRAWER_WIDTH, ASSET_DRAWER_BOTTOM_HEIGHT } from "../AssetDrawer/constants";

interface DrawerLayout {
    orientation: "left" | "bottom";
    drawerInsetLeft: number;
    drawerInsetBottom: number;
    toolbarOffset: number;
}

export function useDrawerLayout(isDrawerOpen: boolean, viewportWidth: number, viewportHeight: number): DrawerLayout {
    return useMemo(() => {
        const orientation: "left" | "bottom" = viewportHeight > viewportWidth ? "bottom" : "left";
        const drawerInsetLeft = orientation === "left" && isDrawerOpen ? ASSET_DRAWER_WIDTH : 0;
        const drawerInsetBottom = orientation === "bottom" && isDrawerOpen ? ASSET_DRAWER_BOTTOM_HEIGHT : 0;
        const toolbarOffset = orientation === "left" && isDrawerOpen ? ASSET_DRAWER_WIDTH + 12 : 0;

        return {
            orientation,
            drawerInsetLeft,
            drawerInsetBottom,
            toolbarOffset,
        };
    }, [isDrawerOpen, viewportWidth, viewportHeight]);
}
