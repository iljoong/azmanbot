using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

using System.Net.Http;
using System.Runtime.Serialization.Json;
using Newtonsoft.Json;

using dotcoreapi.Model;
using System.Diagnostics;

// For more information on enabling Web API for empty projects, visit http://go.microsoft.com/fwlink/?LinkID=397860

namespace dotcoreapi.Controllers
{
    [Route("api/[controller]")]
    public class UsageController : Controller
    {
        // GET api/usage/sku or date
        [HttpGet("{type}")]
        public async Task<ActionResult> Get(string type)
        {
            // get headers
            var headers = Request.Headers;

            string token = headers["Token"];
            string subscription = headers["Subscription"];

            // get this month period
            var startDate = string.Format("{0}-{1}-1", DateTime.Today.Year, DateTime.Today.Month);
            var endDate = string.Format("{0}-{1}-{2}", DateTime.Today.Year, DateTime.Today.Month, DateTime.Today.Day);

            // get access token from Azure
            //string token = await GetToken();

            // added error handling
            try
            {
                // get azure price
                List<Resource> pricelist = await GetPrice(token, subscription);
                List<UsageAggregate> usagelist = await GetUsage(token, subscription, startDate, endDate);

                return (type == "sku") ? usageBySku(pricelist, usagelist) : usageByDate(pricelist, usagelist);
            }
            catch (Exception e)
            {

                var data = new { error = "Internal Error", detail = e.Message };

                return Json(data);

            }

        }

        private ActionResult usageBySku(List<Resource> pricelist, List<UsageAggregate> usagelist)
        {
            var query = from x in (from p in pricelist
                                   join u in usagelist on p.MeterId equals u.properties.meterId
                                   select new { price = p, total = p.MeterRates[0] * u.properties.quantity })
                        group x by x.price.MeterName into g
                        let gtotal = g.Sum(t => t.total)
                        orderby gtotal descending
                        select g;

            List<object> list = new List<object>();
            foreach (var a in query)
            {
                //Console.WriteLine("{0} - {1}", a.Key, a.Sum(t => t.total));
                var d = new { title = a.Key, price = a.Sum(t => t.total) };
                list.Add(d);
            }

            var data = new { values = list, total = query.Sum(x => x.Sum(y => y.total)), currency = "KRW" };

            return Json(data);

        }

        private ActionResult usageByDate(List<Resource> pricelist, List<UsageAggregate> usagelist)
        {
            var query = from x in (from p in pricelist
                                   join u in usagelist on p.MeterId equals u.properties.meterId
                                   orderby u.properties.usageStartTime ascending
                                   select new { udate = u.properties.usageStartTime, total = p.MeterRates[0] * u.properties.quantity })
                        group x by x.udate into g
                        select g;

            List<object> list = new List<object>();
            foreach (var a in query)
            {
                //Console.WriteLine("{0} - {1}", a.Key, a.Sum(t => t.total));
                var d = new { title = a.Key, price = a.Sum(t => t.total) };
                list.Add(d);
            }

            var data = new { values = list, total = query.Sum(x => x.Sum(y => y.total)), currency = "KRW" };

            return Json(data);
        }

        private async Task<List<Resource>> GetPrice(string token, string subscription)
        {
            var filter = "&$filter=OfferDurableId eq 'MS-AZR-0003p' and Currency eq 'KRW' and Locale eq 'en-us' and RegionInfo eq 'KR'";
            var uri = "/subscriptions/" + subscription + "/providers/Microsoft.Commerce/RateCard?api-version=2015-06-01-preview" + filter;

            using (var client = new HttpClient())
            {

                client.BaseAddress = new Uri("https://management.azure.com");

                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

                var resultContent = client.GetStringAsync(uri);
                RateCardPayload payload = JsonConvert.DeserializeObject<RateCardPayload>(await resultContent);

                return payload.Meters;
            }

        }

        private async Task<List<UsageAggregate>> GetUsage(string token, string subscription, string startDate, string endDate)
        {
            var query = "&reportedStartTime=" + startDate + "&reportedEndTime=" + endDate + "&aggregationGranularity=Daily&showDetails=false";
            var uri = "/subscriptions/" + subscription + "/providers/Microsoft.Commerce/UsageAggregates?api-version=2015-06-01-preview" + query;

            using (var client = new HttpClient())
            {

                client.BaseAddress = new Uri("https://management.azure.com");

                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

                var resultContent = client.GetStringAsync(uri);
                UsagePayload payload = JsonConvert.DeserializeObject<UsagePayload>(await resultContent);

                return payload.values;
            }

        }

        /*private async Task<string> GetToken()
        {
            using (var client = new HttpClient())
            {

                client.BaseAddress = new Uri("https://login.microsoftonline.com");

                //client.DefaultRequestHeaders.Accept.Clear();
                //client.DefaultRequestHeaders.TryAddWithoutValidation

                var content = new FormUrlEncodedContent(new[] {
                        new KeyValuePair<string, string>("grant_type", "client_credentials"),
                        new KeyValuePair<string, string>("resource", "https://management.core.windows.net/"),
                        new KeyValuePair<string, string>("client_id", client_id),
                        new KeyValuePair<string, string>("client_secret", client_secret)
                    });

                var result = client.PostAsync("/" + tenant_id + "/oauth2/token", content).Result;

                //string resultContent = result.Content.ReadAsStringAsync().Result;
                //Console.WriteLine(resultContent);

                var serializer = new DataContractJsonSerializer(typeof(Token));

                var token = serializer.ReadObject(await result.Content.ReadAsStreamAsync()) as Token;

                Console.WriteLine(token.access_token);

                return token.access_token;
            }

        }
        */
    }
}
