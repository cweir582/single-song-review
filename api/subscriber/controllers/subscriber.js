const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");

let errorCount = 0;

async function subscribe(email, token) {
  const { LIST_SSR } = process.env;

  const contactInfo = encodeURIComponent(JSON.stringify({"Contact Email": email }));

  //console.log(email.replace("@", "%40"));

  console.log(contactInfo);

  // return;

  const uri = `https://campaigns.zoho.com/api/v1.1/json/listsubscribe?resfmt=JSON&listkey=${LIST_SSR}&contactinfo=${contactInfo}`;

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

    // const tokenDoc = await strapi.query("access-token").find();

    // console.log(tokenDoc.id);

    // // const doc = await strapi.query("access-token").update(
    // //   { id: tokenDoc.id },
    // //   {
    // //     token: accessToken.access_token,
    // //   }
    // // );


    const doc = await strapi.query('access-token').update(
      { token },
      { token:  accessToken.access_token}
    );

    console.log(doc);

    return await subscribe(email, accessToken.access_token);
  }


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
    let entity, success = false;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.subscriber.create(data, { files });
    } else {
      try {
        const { ref, email } = JSON.parse(ctx.request.body);

        const tokenDoc = await strapi.query("access-token").findOne();

        const token = tokenDoc.token;

        const data = await subscribe(email, token);

        console.log(data)

        if(!data.message.startsWith('A confirmation email is sent to the user.')) throw new Error("Something went wrong");

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

        const subs = await strapi.query("subscriber").findOne({ email });

        if(!subs) {
          entity = await strapi.services.subscriber.create(ctx.request.body);
        }

        success = true;

      } catch (error) {
        console.log(error);
        console.log("Oh no!");
      }
    }
    return sanitizeEntity(success || entity, { model: strapi.models.subscriber });
  },
};
