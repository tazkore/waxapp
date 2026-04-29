import { createContext, useContext, ReactNode } from "react";

interface SubStoreCtx {
  subStoreId: string | null;
  subStoreName: string | null;
  brandId: string | null;
}

const Ctx = createContext<SubStoreCtx>({ subStoreId: null, subStoreName: null, brandId: null });

export const SubStoreProvider = ({
  value,
  children,
}: {
  value: SubStoreCtx;
  children: ReactNode;
}) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

export const useSubStore = () => useContext(Ctx);
