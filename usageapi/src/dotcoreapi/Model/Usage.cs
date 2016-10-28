using System.Runtime.Serialization;
using System;
using System.Text;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace dotcoreapi.Model
{
    public class UsagePayload
    {
        [JsonProperty("value")]
        public List<UsageAggregate> values { get; set; }
    }

    public class UsageAggregate
    {
        public string id { get; set; }
        public string name { get; set; }
        public string type { get; set; }
        public Properties properties { get; set; }
    }

    public class Properties
    {
        public string subscriptionId { get; set; }
        public string usageStartTime { get; set; }
        public string usageEndTime { get; set; }
        public string meterId { get; set; }
        public InfoFields infoFields { get; set; }

        [JsonProperty("instanceData")]
        public string instanceDataRaw { get; set; }

        /*public InstanceDataType InstanceData
        {
            get
            {
                return JsonConvert.DeserializeObject<InstanceDataType>(instanceDataRaw.Replace("\\\"", ""));
            }
        }
        */
        public double quantity { get; set; }
        public string unit { get; set; }
        public string meterName { get; set; }
        public string meterCategory { get; set; }
        public string meterSubCategory { get; set; }
        public string meterRegion { get; set; }
    }

    public class InfoFields
    {
        public string meteredRegion { get; set; }
        public string meteredService { get; set; }
        public string project { get; set; }
        public string meteredServiceType { get; set; }
        public string serviceInfo1 { get; set; }
    }

    public class InstanceDataType
    {
        [JsonProperty("Microsoft.Resources")]
        public MicrosoftResourcesDataType MicrosoftResources { get; set; }
    }

    public class MicrosoftResourcesDataType
    {
        public string resourceUri { get; set; }

        public IDictionary<string, string> tags { get; set; }

        public IDictionary<string, string> additionalInfo { get; set; }

        public string location { get; set; }

        public string partNumber { get; set; }

        public string orderNumber { get; set; }
    }
}