import { useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import BoardList from "./components/BoardList";
import BoardPage from "./components/BoardPage";
import UserBadge from "./components/UserBadge";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { getUserId, getUserName, setUserName } from "./lib/identity";

export default function App() {
  const [userName, setUserNameState] = useState(getUserName());
  const userId = getUserId();

  function changeName(name) {
    setUserName(name);
    setUserNameState(name);
  }

  return (
    <div className="app">
      <div className="app__topbar">
        <span className="app__brand">Kanban</span>
        <div className="app__topbar-right">
          <ThemeSwitcher />
          <UserBadge userName={userName} onChangeName={changeName} />
        </div>
      </div>

      <Routes>
        <Route path="/" element={<BoardListRoute />} />
        <Route
          path="/board/:boardId"
          element={<BoardPageRoute user={{ userId, userName }} />}
        />
        {/* Anything unrecognized (e.g. a stale/garbled link) falls back
            to the board list instead of a blank screen. */}
        <Route path="*" element={<BoardListRoute />} />
      </Routes>
    </div>
  );
}

function BoardListRoute() {
  const navigate = useNavigate();
  return <BoardList onOpenBoard={(id) => navigate(`/board/${id}`)} />;
}

function BoardPageRoute({ user }) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  return (
    <BoardPage
      key={boardId}
      boardId={boardId}
      user={user}
      onBack={() => navigate("/")}
    />
  );
}
