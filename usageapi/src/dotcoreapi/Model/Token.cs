using System.Runtime.Serialization;
using System;

namespace dotcoreapi.Model
{
    public class Token
    {
        [DataMember(Name = "access_token")]
        public string access_token;

        [DataMember(Name = "token_type")]
        public string token_type;
    }
}