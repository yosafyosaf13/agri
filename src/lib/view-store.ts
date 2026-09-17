'use client'

import { create } from 'zustand'

export type ViewName =
  | 'dashboard'
  | 'farms'
  | 'visits'
  | 'search'
  | 'settings'
  | 'calendar'
  | 'reports'
  | 'farm-map'
  | 'sat-map'
  | 'team'

export interface ViewParams {
  selectedFarmId?: number
  selectedVisitId?: number
  openVisitForm?: boolean
  openFarmForm?: boolean
  editFarmId?: number
  editVisitId?: number
  openCropForm?: boolean
  cropFarmId?: number
  editCropId?: number
  q?: string
  [key: string]: unknown
}

interface ViewState {
  activeView: ViewName
  viewParams: ViewParams
  setActiveView: (view: ViewName, params?: ViewParams) => void
  setViewParams: (params: ViewParams) => void
  patchViewParams: (params: Partial<ViewParams>) => void
  clearViewParams: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'dashboard',
  viewParams: {},
  setActiveView: (view, params) =>
    set({ activeView: view, viewParams: params ?? {} }),
  setViewParams: (params) => set({ viewParams: params }),
  patchViewParams: (params) =>
    set((s) => ({ viewParams: { ...s.viewParams, ...params } })),
  clearViewParams: () => set({ viewParams: {} }),
}))
