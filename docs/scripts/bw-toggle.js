document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.id = "bw-toggle";

  // Restaurer le mode depuis le stockage local
  const savedMode = localStorage.getItem("bw_mode");
  if (savedMode === "on") {
    document.documentElement.classList.add("bw");
  }

  btn.textContent = document.documentElement.classList.contains("bw")
    ? "Mode couleur"
    : "Mode noir & blanc";

  btn.onclick = () => {
    const html = document.documentElement;
    html.classList.toggle("bw");

    const isBW = html.classList.contains("bw");
    localStorage.setItem("bw_mode", isBW ? "on" : "off");

    btn.textContent = isBW
      ? "Mode couleur"
      : "Mode noir & blanc";
  };

  document.body.appendChild(btn);
});
