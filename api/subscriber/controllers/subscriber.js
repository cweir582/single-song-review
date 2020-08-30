const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");

let errorCount = 0;

async function subscribe(email, token) {
  const { LIST_SSR } = process.env;

  const contactInfo = JSON.stringify({ "Contact Email": email });

  const uri = `https://campaigns.zoho.com/api/v1.1/json/listsubscribe?resfmt=JSON&listkey=${LIST_SSR}&contactinfo=${encodeURIComponent(
    contactInfo
  )}`;

  const res = await fetch(uri, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  let data = await res.json();

  if (data.Code === "1007") {
    const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
    const res = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${REFRESH_TOKEN}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const accessToken = await res.json();

    return await subscribe(email, accessToken.access_token);
  }

  console.log(data);

  if (data.status !== "success") {
    throw new Error("Something went wrong!");
  }

  if (
    data.message.startsWith("This email address already exists in the list.")
  ) {
    throw new Error("Already Exists");
  }

  return data;
}

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.subscriber.create(data, { files });
    } else {
      try {
        const { ref, email } = JSON.parse(ctx.request.body);

        const token =
          "1000.12c9694de750b7a0039761e714835ffe.13d067ce33ff85820a88255918a7d52d";

        console.log(email);

        const data = await subscribe(email, token);

        // console.log(JSON.parse(ctx.request.body));

        if (ref) {
          const artist = await strapi
            .query("artist")
            .findOne({ referral: ref });

          await strapi.query("artist").update(
            { id: artist.id },
            {
              referred: artist.referred + 1,
            }
          );
        }

        entity = await strapi.services.subscriber.create(ctx.request.body);
      } catch (error) {
        console.log("Oh no!");
      }
    }
    return sanitizeEntity(entity, { model: strapi.models.subscriber });
  },
};
