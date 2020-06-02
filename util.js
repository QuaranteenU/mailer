exports.abbreviateDegree = (degree) => {
  const words = degree.split(" ");
  return words
    .filter((w) => w[0] === w[0].toUpperCase())
    .map((w) => {
      if (w === "/") return w;
      return `${w[0]}.`;
    })
    .join("");
};

exports.splitIntoLines = (original) => {
  const nameParts = original.split(" ");
  if (nameParts.length < 2) {
    return [original];
  }

  const partLength = nameParts.map((p) => p.length);
  const totalLength = original.length;
  let len1 = totalLength,
    len2 = 0,
    split = nameParts.length - 1;

  for (let i = nameParts.length - 1; i >= 0; i--) {
    if (
      Math.abs(len1 - partLength[i] - (len2 + partLength[i])) >
      Math.abs(len1 - len2)
    ) {
      break;
    } else {
      len1 -= partLength[i];
      len2 += partLength[i];
      split--;
    }
  }

  const toReturn = ["", ""];
  for (let i = 0; i < nameParts.length; i++) {
    if (i <= split) {
      toReturn[0] += nameParts[i] + (i == split ? "" : " ");
    } else {
      toReturn[1] += nameParts[i] + (i + 1 == nameParts.length ? "" : " ");
    }
  }

  return toReturn;
};

exports.pruneContacts = async (contacts, sgClient) => {
  console.log("=> Pruning contacts");
  console.log("original contacts", contacts.length);
  const uniqueEmails = new Set(contacts.map((c) => c["Email Address"]));
  let uniqueContacts = Array.from(uniqueEmails).map((email) =>
    contacts.find((c) => c["Email Address"] === email)
  );
  console.log("unique contacts", uniqueContacts.length);

  let [response, bounces] = await sgClient.request({
    method: "GET",
    url: "/v3/suppression/bounces",
  });
  bounces = bounces.map((c) => c.email);
  uniqueContacts = uniqueContacts.filter(
    (c) => !bounces.includes(c["Email Address"])
  );
  console.log("remove bounces", uniqueContacts.length);

  let [response2, unsubs] = await sgClient.request({
    method: "GET",
    url: "/v3/suppression/unsubscribes",
  });
  unsubs = unsubs.map((c) => c.email);
  uniqueContacts = uniqueContacts.filter(
    (c) => !unsubs.includes(c["Email Address"])
  );
  console.log("remove unsubs", uniqueContacts.length);
  return uniqueContacts;
};
