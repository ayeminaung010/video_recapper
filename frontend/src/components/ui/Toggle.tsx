interface ToggleProps {
  active: boolean;
  onClick: () => void;
}

export default function Toggle({ active, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-5 rounded-full relative transition-colors ${
        active ? "bg-indigo-600" : "bg-gray-800"
      }`}
    >
      <div
        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
          active ? "left-6" : "left-1"
        }`}
      ></div>
    </button>
  );
}
