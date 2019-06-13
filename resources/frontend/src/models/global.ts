import { getNotices,getAccountMenus } from '@/services/api';
import { Subscription } from 'dva';
import { Reducer } from 'redux';
import { Effect } from './connect';
import { NoticeIconData } from '@/components/NoticeIcon';
import router from 'umi/router';

export interface NoticeItem extends NoticeIconData {
  id: string;
  type: string;
  [key: string]: any;
}

export interface GlobalModelState {
  collapsed: boolean;
  notices: NoticeItem[];
  menuData:any;
}

export interface GlobalModelType {
  namespace: 'global';
  state: GlobalModelState;
  effects: {
    fetchNotices: Effect;
    clearNotices: Effect;
    changeNoticeReadState: Effect;
    getMenuData:Effect;
  };
  reducers: {
    changeLayoutCollapsed: Reducer<GlobalModelState>;
    saveNotices: Reducer<GlobalModelState>;
    saveClearedNotices: Reducer<GlobalModelState>;
    save: Reducer<GlobalModelState>;
  };
  subscriptions: { setup: Subscription };
}

const GlobalModel: GlobalModelType = {
  namespace: 'global',

  state: {
    collapsed: false,
    notices: [],
    menuData: [],
  },

  effects: {
    *fetchNotices(_, { call, put, select }) {
      const data = yield call(getNotices);
      yield put({
        type: 'saveNotices',
        payload: data,
      });
      const unreadCount: number = yield select(
        state => state.global.notices.filter(item => !item.read).length,
      );
      yield put({
        type: 'account/changeNotifyCount',
        payload: {
          totalCount: data.length,
          unreadCount,
        },
      });
    },
    *clearNotices({ payload }, { put, select }) {
      yield put({
        type: 'saveClearedNotices',
        payload,
      });
      const count: number = yield select(state => state.global.notices.length);
      const unreadCount: number = yield select(
        state => state.global.notices.filter(item => !item.read).length,
      );
      yield put({
        type: 'account/changeNotifyCount',
        payload: {
          totalCount: count,
          unreadCount,
        },
      });
    },
    *changeNoticeReadState({ payload }, { put, select }) {
      const notices: NoticeItem[] = yield select(state =>
        state.global.notices.map(item => {
          const notice = { ...item };
          if (notice.id === payload) {
            notice.read = true;
          }
          return notice;
        }),
      );
      yield put({
        type: 'saveNotices',
        payload: notices,
      });
      yield put({
        type: 'account/changeNotifyCount',
        payload: {
          totalCount: notices.length,
          unreadCount: notices.filter(item => !item.read).length,
        },
      });
    },
    *getMenuData({ payload }, { put, call}) {
      const response = yield call(getAccountMenus);
      if (response.status === 'success') {
        const menuData = response.data;
        yield put({
          type: 'save',
          payload: { menuData:menuData },
        });
      }
    },
  },

  reducers: {
    changeLayoutCollapsed(state = { notices: [], collapsed: true ,menuData: []}, { payload }) {
      return {
        ...state,
        collapsed: payload,
      };
    },
    saveNotices(state, { payload }) {
      return {
        collapsed: false,
        ...state,
        notices: payload,
      };
    },
    saveClearedNotices(state = { notices: [], collapsed: true,menuData: [] }, { payload }) {
      return {
        collapsed: false,
        ...state,
        notices: state.notices.filter(item => item.type !== payload),
      };
    },
    save(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },

  subscriptions: {
    setup({ history }) {
      // Subscribe history(url) change, trigger `load` action if pathname is `/`
      return history.listen(({ pathname, search }) => {
        // 未登录用户，进行登录
        if (!sessionStorage['token'] && pathname !== '/login') {
          router.push('/login');
        }

        if (typeof (window as any).ga !== 'undefined') {
          (window as any).ga('send', 'pageview', pathname + search);
        }
      });
    },
  },
};

export default GlobalModel;
