import { AppProvider, useApp } from "./store/AppContext";
import { Dot, Notice } from "./components/common";
import { nickOf } from "./lib/members";
import { HomeView, ScheduleView, TripsView, AlbumView } from "./views/Views";
import { SheetLayer } from "./sheets/Sheets";

function Icon({ name, on }) {
  const common = {
    width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: on ? 2.2 : 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case "schedule":
      return <svg {...common}><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>;
    case "trips":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" /></svg>;
    default:
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg>;
  }
}

const TABS = [
  { id: "home", icon: "home", label: "홈", view: HomeView, fab: "일정 추가", fabAct: "eventForm" },
  { id: "schedule", icon: "schedule", label: "일정", view: ScheduleView, fab: "일정 추가", fabAct: "eventForm" },
  { id: "trips", icon: "trips", label: "여행", view: TripsView, fab: "여행지 추가", fabAct: "tripForm" },
  { id: "album", icon: "album", label: "앨범", view: AlbumView, fab: "", fabAct: null },
];

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { tab, setTab, uid, members, offline, mode, canWrite, slow, toastState, openSheet } = useApp();
  const current = TABS.find(t => t.id === tab) || TABS[0];
  const View = current.view;

  const changeTab = t => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  const showFab = !!current.fab && canWrite && !offline;

  return (
    <>
      <div className="mx-auto max-w-[520px] px-5 pb-[calc(150px+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-3 pb-3 pt-[calc(22px+env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h1 className="m-0 text-[24px] font-bold leading-[1.3] tracking-[-0.4px] text-ink">다정도 🏝</h1>
            <p className="m-0 mt-0.5 text-[14px] text-ink-soft">셋이 함께 쌓는 일정과 추억</p>
          </div>
          {uid && (
            <button
              className="flex flex-none items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-3.5 text-[14px] font-medium shadow-[0_1px_2px_rgba(25,31,40,.06)]"
              onClick={() => openSheet({ type: "profile" })}
              aria-label="내 프로필 설정"
            >
              {members[uid]
                ? <><Dot id={uid} size={26} /><span>{nickOf(members, uid)}</span></>
                : <><span className="inline-grid h-[26px] w-[26px] place-items-center rounded-full bg-ink-mute text-[13px] font-bold text-white">?</span><span>내 이름 정하기</span></>}
            </button>
          )}
        </header>

        <div>
          {mode === "local" && <Notice>이 기기(브라우저)에만 저장돼요.</Notice>}
          {slow && <Notice>데이터를 불러오는 데 시간이 걸리고 있어요. 보이는 내용이 최신이 아닐 수 있어요.</Notice>}
        </div>

        <main>
          <View />
        </main>
      </div>

      {showFab && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[11] flex justify-end px-5">
          <button
            className="pointer-events-auto rounded-full bg-blue px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(49,130,246,.35)]"
            onClick={() => current.fabAct === "tripForm" ? openSheet({ type: "tripForm" }) : openSheet({ type: "eventForm" })}
          >
            + {current.fab}
          </button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="메뉴">
        <div className="flex w-full max-w-[520px]">
          {TABS.map(t => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11.5px] font-medium ${on ? "text-ink" : "text-ink-mute"}`}
                aria-current={on ? "page" : undefined}
                onClick={() => changeTab(t.id)}
              >
                <Icon name={t.icon} on={on} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <SheetLayer />

      {toastState && (
        <div
          key={toastState.key}
          className="fixed bottom-[calc(150px+env(safe-area-inset-bottom))] left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-[14px] font-medium text-white shadow-lg"
        >
          {toastState.msg}
        </div>
      )}
    </>
  );
}
