import { createContext, useContext } from 'react'

export const MetaContext = createContext({
  meta: null,
  metaLoading: true,
  metaError: null,
  refreshMeta: async () => {},
})

export function useMeta() {
  return useContext(MetaContext)
}
