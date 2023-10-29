using Microsoft.Extensions.Configuration;

namespace blog
{
    public static class Config
    {
        private static string content = "content.json";

        //About
        public static string Name { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Name"];
        public static string Title { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Title"];
        public static string Section1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section1"];
        public static string Section2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section2"];
        public static string Section3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section3"];

        //Blog
        public static string Blog1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section1"];
        public static string Blog2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section2"];
        public static string Blog3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section3"];
        public static string Blog4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section4"];
        public static string Blog5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section5"];

        //Home
        public static string Profile { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Profile"];
        public static string Logo { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Logo"];
        public static string Portrait { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Portrait"];
        public static string Biography { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Biography"];
        public static string Blog { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Blog"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["LinkedIn"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["GitHub"];
        public static string CurrentRole { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CurrentRole"];
        public static string TechStack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TechStack"];
        public static string Certifications { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Certifications"];
        public static string SpecialAwards { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SpecialAwards"];
        public static string Capitec { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Capitec"];
        public static string Back { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Back"];

        //Special Awards
        public static string Rockstar { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("SpecialAwards")["Rockstar"];

        //Certifications: AWS
        public static string CloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Foundational")["CloudPractitioner"];
        public static string SolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Associate")["SolutionsArchitect"];
        public static string CloudQuestCloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:CloudQuest")["CloudPractitioner"];
        public static string CloudQuestSolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:CloudQuest")["SolutionsArchitect"];
        public static string EducateGettingStartedWithCompute { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithCompute"];
        public static string EducateGettingStartedWithNetworking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithNetworking"];
        public static string EducateGettingStartedWithDatabases { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithDatabases"];
        public static string EducateGettingStartedWithStorage { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithStorage"];
        public static string EducateGettingStartedWithCloudOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithCloudOps"];

        //Certification: Other
        public static string MCT2018_2019 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Other:MCT")["2018-2019"];
    }
}
