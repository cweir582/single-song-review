const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");
const crypto = require('crypto');
const stripe = require("stripe")(process.env.STRIPE_SK);

let errorCount = 0;

async function subscribe(email, hellreview = false) {
  const { LIST_SSR, LIST_HR } = process.env;

  const tokenDoc = await strapi.query("access-token").findOne();
  const token = tokenDoc.token;

  const contactInfo = encodeURIComponent(JSON.stringify({"Contact Email": email }));

  // return;

  const uri = hellreview ? `https://campaigns.zoho.com/api/v1.1/addlistsubscribersinbulk?listkey=${LIST_HR}&resfmt=JSON&emailids=${email}`
  : `https://campaigns.zoho.com/api/v1.1/json/listsubscribe?resfmt=JSON&listkey=${LIST_SSR}&contactinfo=${contactInfo}`;


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

    return await subscribe(email, hellreview);
  }

  if (data.status !== "success") {
    throw new Error("Something went wrong!");
  }

  if (
    data.message && data.message.startsWith("This email address already exists in the list.")
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
    console.log("Hi");
    let entity, success = false;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.subscriber.create(data, { files });
    } else {
      try {
        const { ref, email } = JSON.parse(ctx.request.body);

        const data = await subscribe(email);


        if(!data.message.startsWith('A confirmation email is sent to the user.')) throw new Error("Something went wrong");

        // console.log(JSON.parse(ctx.request.body));

        if (ref) {
          const artist = await strapi
            .query("artist")
            .findOne({ referral: ref });

          const milestone = await strapi.query("milestone").findOne({ min_referral: artist.referred + 1 });

          await strapi.query("artist").update(
            { id: artist.id },
            {
              referred: artist.referred + 1,
              milestone: milestone ? milestone : artist.milestone,
              rewarded: milestone ? false : artist.rewarded
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

  // Generate confirmation token
  async hellReview(ctx) {
    let subscriber;
    const { email } = JSON.parse(ctx.request.body);
    const token = crypto.randomBytes(64).toString('hex');


    try {
      const alreadySubscribed = await strapi.query('subscriber').findOne({ email });
      if (alreadySubscribed) {
        subscriber = await strapi.query('subscriber').update(
          { id: alreadySubscribed.id },
          { hr_token: token}
        );
      }else {
        subscriber = await strapi.query('subscriber').create({
          email,
          hr_token: token
        });
      }

      await strapi.plugins['email'].services.email.send({
        to: email,
        from: 'hi@asinglesongreview.com',
        replyTo: 'hi@asinglesongreview.com',
        subject: 'Confirm you email',
        text: 'Please confirm your email using this link ' + process.env.FRONTEND_URL + '/hell-review/confirmed?token=' + token,
      });
    } catch (error) {
      console.log(error);
      console.log("Oh no!");
    }

    return sanitizeEntity(subscriber, { model: strapi.models.subscriber });
  },

  // Check HR token for email confirmation
  async checkToken(ctx) {
    const {token} = ctx.params;

    console.log(token);

    let subscriber;
    try {
      subscriber = await strapi.query('subscriber').findOne({ hr_token: token });
    } catch (error) {
      console.log("Oh no!");
    }

    return sanitizeEntity(subscriber, { model: strapi.models.subscriber });
  },

  async subscribeToHR(ctx) {
    let subscriber;

    const { token } = ctx.params;

    try {

    subscriber = await strapi.query('subscriber').findOne({ hr_confirm: token });

    const data = await subscribe(subscriber.email, true);

    await strapi.query("subscriber").update(
      { id: subscriber.id  },
      {
        hr_confirm: null,
        hr_token: null,
        hellreview: true
      }
    );
    } catch (error) {
      console.log(error);
      console.log("Oh no!");
    }

    return sanitizeEntity(subscriber, { model: strapi.models.subscriber });
  },

  async verifyHRUnsubEmail(ctx) {
    let subscriber;
    const { email } = JSON.parse(ctx.request.body);
    const token = crypto.randomBytes(64).toString('hex');


    try {
      const alreadySubscribed = await strapi.query('subscriber').findOne({ email });

      if(!alreadySubscribed && !alreadySubscribed.hr_sessionid) throw new Error("Not subscribed");

        subscriber = await strapi.query('subscriber').update(
          { id: alreadySubscribed.id },
          { hr_confirm: token}
        );


      await strapi.plugins['email'].services.email.send({
        to: email,
        from: 'hi@asinglesongreview.com',
        replyTo: 'hi@asinglesongreview.com',
        subject: 'Confirm you email',
        text: 'Please confirm your email using this link ' + process.env.FRONTEND_URL + '/hell-review/unsubscribe?confirm=' + token,
      });
    } catch (error) {
      console.log(error);
      console.log("Oh no!");
    }

    return sanitizeEntity(subscriber, { model: strapi.models.subscriber });
  }
};
