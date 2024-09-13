import "source-map-support/register";
import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/apiGateway";
import { APIGatewayEvent } from "aws-lambda";
import { stripeProduct } from "~/src/stripe";
import { middyfy, parse } from "@libs/lambda";
import { Stripe } from "stripe";

interface IParams {
  page: string;
  limit: number;
}

const viewProductsHandler: ValidatedEventAPIGatewayProxyEvent<Stripe.ProductListParams> = async (
  event: APIGatewayEvent
) => {
  const { page, limit } = parse<IParams>(event.queryStringParameters);

  try {
    let data = await stripeProduct.listAll({
      limit: limit,
    });

    // Pagination config
    const pageInt = parseInt(page)
    const allItems = await stripeProduct.listAll();
    const isFirstIndex = pageInt === 1
    const getLimit = parseInt(limit.toString())
    const itemsLength = allItems.data.length

    const minimumLimit = getLimit === 1
    const maximumLimit = getLimit === itemsLength

    // Runs only when it is not index and boundary is not the first index
    // When the limit is maximum, only first page allowed
    if (data.has_more && !isFirstIndex && !maximumLimit && !minimumLimit) {
      data = await stripeProduct.listAll({
        limit: limit,
        starting_after: allItems.data[pageInt - 1].id,
      });
    }

    // Runs only when limit === 1
    if (minimumLimit && !isFirstIndex) {
      data = await stripeProduct.listAll({
        limit: limit,
        starting_after: allItems.data[pageInt - 2].id,
      });
    }

    // Return empty data if limit === items.length
    // Anda page !== 1
    if (pageInt > 1 && maximumLimit) {
      data = await stripeProduct.listAll({
        limit: limit,
        starting_after: allItems.data[itemsLength].id,
      });
    }

    return formatJSONResponse({ ...data });
  } catch (error) {
    return formatJSONResponse(error);
  }
};

export const main = middyfy(viewProductsHandler);
