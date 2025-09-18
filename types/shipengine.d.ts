export type ShipEngineRate = {
  rate_id: string;
  service_code: string;
  carrier_code: string;
  shipping_amount: {
    currency: string;
    amount: number;
  };
};

export type RatesResponse = {
  rates: ShipEngineRate[];
};
