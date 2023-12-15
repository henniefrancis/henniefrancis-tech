using Microsoft.Extensions.Configuration;

namespace blog.Config
{
    public static class About
    {
        private static string content = "content/about.json";
        //About
        public static string Name { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Name"];
        public static string Title { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Title"];
        public static string TagLine { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["TagLine"];
        public static string Section1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section1"];
        public static string Section2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section2"];
        public static string Section3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section3"];

        //Blog
        public static string Blog1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section1"];
        public static string Blog2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section2"];
        public static string Blog3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section3"];
        public static string Blog4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section4"];
        public static string Blog5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section5"];
    }
    public static class Links
    {
        private static string content = "content/links.json";

        public static string Blog { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Blog"];
        public static string Sessionize { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Sessionize"];
        public static string Facebook { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Facebook"];
        public static string Twitter { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Twitter"];
        public static string Instagram { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Instagram"];
        public static string YouTube { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["YouTube"];
        public static string Twitch { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Twitch"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["LinkedIn"];
        public static string TikTok { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["TikTok"];
        public static string Discord { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Discord"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["GitHub"];
        public static string StackOverflow { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["StackOverflow"];
        public static string DEV { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["DEV"];
        public static string Medium { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Medium"];
        public static string BMAC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["BMAC"];
        public static string Kofi { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Kofi"];
        public static string dotcoreSolutions { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["dotcoreSolutions"];
        public static string GoogleDev { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["GoogleDev"];
        public static string Credly { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Credly"];

        public static string GitHubProject { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("DotNetConference2023")["IaC"];
    }
}

namespace blog.Config.Images
{
    public static class General
    {
        private static string content = "content/images.json";

        //Home
        public static string Profile { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Profile"];
        public static string Logo { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Logo"];
        public static string Portrait { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Portrait"];
        public static string Biography { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Biography"];
        public static string Blog { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Blog"];
        public static string CurrentRole { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CurrentRole"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["LinkedIn"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["GitHub"];
        public static string Sessionize { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Sessionize"];
        public static string TechStack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TechStack"];
        public static string Certifications { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Certifications"];
        public static string SpecialAwards { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SpecialAwards"];
        public static string Capitec { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Capitec"];
        public static string Back { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Back"];

    }

    public static class Socials
    {
        private static string content = "content/socials.json";

        //Socials
        public static string Sessionize { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Sessionize"];
        public static string Facebook { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Facebook"];
        public static string Twitter { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Twitter"];
        public static string Instagram { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Instagram"];
        public static string YouTube { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["YouTube"];
        public static string Twitch { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Twitch"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["LinkedIn"];
        public static string TikTok { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["TikTok"];
        public static string Discord { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Discord"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["GitHub"];
        public static string StackOverflow { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["StackOverflow"];
        public static string DEV { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["DEV"];
        public static string Medium { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Medium"];
        public static string BMAC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["BMAC"];
        public static string Kofi { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Kofi"];
        public static string dotcoreSolutions { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["dotcoreSolutions"];
        public static string GoogleDev { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["GoogleDev"];
        public static string Credly { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Socials")["Credly"];

    }

    public static class SpecialAwards
    {
        private static string content = "content/specialawards.json";

        //Special Awards
        public static string Rockstar { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("SpecialAwards")["Rockstar"];

    }

    public static class AWS
    {
        private static string content = "content/aws.json";

        //Certifications: AWS
        public static string CloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Foundational")["CloudPractitioner"];
        public static string SolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Associate")["SolutionsArchitect"];
        public static string CloudQuestCloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["CloudPractitioner"];
        public static string CloudQuestSolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["SolutionsArchitect"];
        public static string EducateGettingStartedWithCompute { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithCompute"];
        public static string EducateGettingStartedWithNetworking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithNetworking"];
        public static string EducateGettingStartedWithDatabases { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithDatabases"];
        public static string EducateGettingStartedWithStorage { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithStorage"];
        public static string EducateGettingStartedWithCloudOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithCloudOps"];
        public static string EducateGettingStartedWithServerless { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithServerless"];
        public static string EducateGettingStartedWithSecurity { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithSecurity"];


    }

    public static class Microsoft
    {
        private static string other = "content/other.json";
        //Certification: Other
        public static string MCT2018_2019 { get; set; } = new ConfigurationBuilder().AddJsonFile(other).Build().GetSection("Certifications:Microsoft:MCT")["2018-2019"];

        private static string microsoft = "content/microsoft.json";
        private static string badges = "content/badges.json";

        //Certification: Microsoft
        public static string Microsoft_badge_Power_Platform_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["power-platform-fundamentals"];
        public static string Microsoft_cert_Power_Platform_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:Data")["power-platform-fundamentals"];

        public static string Microsoft_badge_Azure_Data_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["azure-data-fundamentals"];
        public static string Microsoft_cert_Azure_Data_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:Data")["azure-data-fundamentals"];

        public static string Microsoft_badge_Azure_AI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["azure-ai-fundamentals"];
        public static string Microsoft_cert_Azure_AI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:Data")["azure-ai-fundamentals"];

        public static string Microsoft_badge_Azure_SCI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["azure-sci-fundamentals"];
        public static string Microsoft_cert_Azure_SCI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:Data")["azure-sci-fundamentals"];

        public static string Microsoft_badge_MCPD_Web { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCPD_Web"];
        public static string Microsoft_cert_MCPD_Web { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCPD_Web"];

        public static string Microsoft_badge_dotnet_35_BID { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_BID"];
        public static string Microsoft_cert_dotnet_35_BID { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_BID"];

        public static string Microsoft_badge_MCTS_SQL_BI { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCTS_SQL_BI"];
        public static string Microsoft_cert_MCTS_SQL_BI { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCTS_SQL_BI"];

        public static string Microsoft_badge_MCTS_SPD { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCTS_SPD"];
        public static string Microsoft_cert_MCTS_SPD { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCTS_SPD"];

        public static string Microsoft_badge_MCTS_DA { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCTS_DA"];
        public static string Microsoft_cert_MCTS_DA { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCTS_DA"];

        public static string Microsoft_badge_dotnet_35_DBD { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_DBD"];
        public static string Microsoft_cert_dotnet_35_DBD { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_DBD"];

        public static string Microsoft_badge_dotnet_35_WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_WCF"];
        public static string Microsoft_cert_dotnet_35_WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_WCF"];

        public static string Microsoft_badge_dotnet_35_EAD { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_EAD"];
        public static string Microsoft_cert_dotnet_35_EAD { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_EAD"];

        public static string Microsoft_badge_dotnet_35_ADO { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_ADO"];
        public static string Microsoft_cert_dotnet_35_ADO { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_ADO"];

        public static string Microsoft_badge_dotnet_35_ASP { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_ASP"];
        public static string Microsoft_cert_dotnet_35_ASP { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_ASP"];

        public static string Microsoft_badge_dotnet_35_WFA { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["dotnet_3.5_WFA"];
        public static string Microsoft_cert_dotnet_35_WFA { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["dotnet_3.5_WFA"];

        public static string Microsoft_badge_MCTS_WA { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCTS_WA"];
        public static string Microsoft_cert_MCTS_WA { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCTS_WA"];

        public static string Microsoft_badge_MCTS_SCA { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCTS_SCA"];
        public static string Microsoft_cert_MCTS_SCA { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCTS_SCA"];

        public static string Microsoft_badge_MCPD { get; set; } = new ConfigurationBuilder().AddJsonFile(badges).Build().GetSection("Badges:Microsoft")["MCPD"];
        public static string Microsoft_cert_MCPD { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCPD"];
    }
}

namespace blog.Config.Tech.Links
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JAVA"];
        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JS"];
        public static string MSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MSSQL"];
        public static string TSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TSQL"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["HTML5"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Angular"];
    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JS"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Bootstrap"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["jQuery"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["HTML5BoilerPlate"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Angular"];
    }
}

namespace blog.Config.Tech.Rating
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JAVA"];
        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JS"];
        public static string MSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["MSSQL"];
        public static string TSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TSQL"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["HTML5"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Angular"];

    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JS"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Bootstrap"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["jQuery"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["HTML5BoilerPlate"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Angular"];
    }
}

namespace blog.Config.Images.TechStack
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JAVA"];
        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JS"];
        public static string MSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MSSQL"];
        public static string TSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TSQL"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["HTML5"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Angular"];
    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JS"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Bootstrap"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["jQuery"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["HTML5BoilerPlate"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Angular"];
    }
}