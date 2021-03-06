import { createSelector } from 'reselect';

import * as fromDapps from '../dapps';
import * as fromUi from '../ui';
import * as fromActions from './actions';
import { Action } from '../';
import { VERSION } from '../../CONSTANTS';
import { Language } from '../../models';

export interface ModalButton {
  classNames: string;
  text: string;
  action?: { type: string; payload?: any } | { type: string; payload?: any }[];
}

export interface Modal {
  dappId?: string;
  parameters?: any;
  title: string;
  text: string;
  buttons: ModalButton[];
}

export interface State {
  currentVersion: undefined | string;
  isBeta: boolean;
  language: Language;
  versionAwaitingUpdate: undefined | string;
  errors: { errorCode: number; error: string; trace?: string }[];
  modals: Modal[];
  dappModals: {
    [dappId: string]: Modal[];
  };
  initializationOver: boolean;
  loadResourceWhenReady: undefined | string;
}

export const initialState: State = {
  currentVersion: VERSION,
  isBeta: true,
  language: 'en',
  versionAwaitingUpdate: undefined,
  errors: [],
  modals: [],
  dappModals: {},
  initializationOver: false,
  loadResourceWhenReady: undefined,
};

export const reducer = (state = initialState, action: Action): State => {
  switch (action.type) {
    case fromActions.UPDATE_MAIN_FROM_STORAGE: {
      const payload = action.payload as fromActions.UpdateMainFromStoragePayload;
      return {
        ...state,
        ...payload.mainState,
      };
    }

    case fromActions.SAVE_ERROR: {
      return {
        ...state,
        errors: state.errors.concat(action.payload),
      };
    }

    case fromActions.OPEN_MODAL: {
      const payload: fromActions.OpenModalPayload = action.payload;

      return {
        ...state,
        modals: state.modals.concat(payload),
      };
    }

    case fromActions.CLOSE_MODAL: {
      return {
        ...state,
        modals: state.modals.slice(1).concat([]),
      };
    }

    case fromActions.OPEN_DAPP_MODAL: {
      const payload: fromActions.OpenDappModalPayload = action.payload;

      let dappModalsState: Modal[] = state.dappModals[payload.dappId];
      if (!dappModalsState) {
        dappModalsState = [];
      }

      // if the IP / DA button is re-clicked, simply toggle the modal (remove it)
      if (
        payload.title === 'LOAD_INFO_MODAL' &&
        dappModalsState &&
        dappModalsState[0] &&
        dappModalsState[0].title === 'LOAD_INFO_MODAL'
      ) {
        return {
          ...state,
          dappModals: {
            ...state.dappModals,
            [payload.dappId]: dappModalsState.slice(1).concat([]),
          },
        };
      }

      return {
        ...state,
        dappModals: {
          ...state.dappModals,
          [payload.dappId]: dappModalsState.concat(payload),
        },
      };
    }

    case fromActions.CLOSE_DAPP_MODAL: {
      const payload: fromActions.CloseDappModalPayload = action.payload;

      const dappModalsState: Modal[] = state.dappModals[payload.dappId];

      return {
        ...state,
        dappModals: {
          ...state.dappModals,
          [payload.dappId]: dappModalsState.slice(1).concat([]),
        },
      };
    }

    case fromActions.CLOSE_ALL_DAPP_MODALS: {
      const payload: fromActions.CloseDappModalPayload = action.payload;

      let newDappModals = state.dappModals;
      delete newDappModals[payload.dappId];

      return {
        ...state,
        dappModals: newDappModals,
      };
    }

    case fromDapps.STOP_TAB: {
      const payload: fromDapps.StopTabPayload = action.payload;

      // ugly, I know, should we include dappId in the payload ?
      const dappModalsToRemove = Object.keys(state.dappModals).filter((dappId) => dappId.includes(payload.tabId));
      const newDappModals = { ...state.dappModals };

      dappModalsToRemove.forEach((dappId) => {
        delete newDappModals[dappId];
      });

      return {
        ...state,
        dappModals: newDappModals,
      };
    }

    case fromActions.UPDATE_INITIALIZATION_OVER: {
      return {
        ...state,
        initializationOver: true,
      };
    }

    case fromActions.UPDATE_LOAD_RESOURCE_WHEN_READY: {
      const payload: fromActions.UpdateLoasResourceWhenReadyPayload = action.payload;

      return {
        ...state,
        loadResourceWhenReady: payload.loadResource,
      };
    }

    default:
      return state;
  }
};

// SELECTORS

export const getMainState = createSelector(
  (state) => state,
  (state: any) => state.main
);

export const getErrors = createSelector(getMainState, (state: State) => state.errors);
export const getModal = createSelector(getMainState, (state: State) => state.modals[0]);
export const getDappModals = createSelector(getMainState, (state: State) => state.dappModals);
export const getCurrentVersion = createSelector(getMainState, (state: State) => state.currentVersion);
export const getIsBeta = createSelector(getMainState, (state: State) => state.isBeta);
export const getInitializationOver = createSelector(getMainState, (state: State) => state.initializationOver);
export const getLoadResourceWhenReady = createSelector(getMainState, (state: State) => state.loadResourceWhenReady);

export const getShouldBrowserViewsBeDisplayed = createSelector(
  fromUi.getIsNavigationInDapps,
  fromUi.getNavigationSuggestionsDisplayed,
  getDappModals,
  fromDapps.getTabsFocusOrder,
  fromDapps.getTabs,
  (isNavigationInDapps, navigationSuggestionsDisplayed, dappModals, tabsFocusOrder, tabs) => {
    if (!navigationSuggestionsDisplayed && isNavigationInDapps && tabsFocusOrder.length > 0) {
      const tab = tabs.find((t) => t.id === tabsFocusOrder[tabsFocusOrder.length - 1]);
      // should always be true
      if (tab && (!dappModals[tab.resourceId] || dappModals[tab.resourceId].length === 0)) {
        return tab.resourceId;
      }
      return undefined;
    } else {
      return undefined;
    }
  }
);
