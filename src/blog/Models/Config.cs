using Microsoft.Extensions.Configuration;

namespace blog
{
    public static class Config
    {
        public static string Logo { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["Logo"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["LinkedIn"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["GitHub"];
        public static string Certifications { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["Certifications"];
        public static string TechStack { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["TechStack"];
        public static string Career { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["Career"];
        public static string Capitec { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["Capitec"];
        public static string Back { get; set; } = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build().GetSection("Images")["Back"];
    }
}
