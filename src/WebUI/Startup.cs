using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace WebUI
{
    class Startup
    {
        public void Configure(IApplicationBuilder app)
        {
            app.Run(context => context.Response.WriteAsync("Uperstart is alive!!"));
        }
    }
}
