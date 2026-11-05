export const nickOf = (members, id) => (members[id] && members[id].nick) || "누군가";
export const colorOf = (members, id) => (members[id] && members[id].color) || "#9AA7AA";
