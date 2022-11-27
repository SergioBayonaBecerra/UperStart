using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace WebUI
{
    class Program
    {
        static void Main(string[] args)
        {
            var host = new WebHostBuilder()
          .UseKestrel()
          .UseStartup<Startup>()
          .UseIISIntegration()
          .UseContentRoot(Directory.GetCurrentDirectory())
          .Build();
          host.Run();
        }
    }
}
