 using Microsoft.Extensions.Configuration;

namespace blog.Secrets
{
    public static class AWS
    {
        public static string aws_username { get; } = "AKIA2K7ZGXNAU5EYC3YJ";
        public static string aws_password { get; } = "T7YIdH4r4qx69+CN9RROX//2dbagsPQM7enwrlSi";
    }

}

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

        public static string DotNetConference2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("GitHubProjects")["DotNetConference2023"];
        public static string GoogleIOExtended2024 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("GitHubProjects")["GoogleIOExtend2024"];
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
        public static string SocialMedia { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SocialMedia"];
        public static string PoE { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["PoE"];
        public static string PublicSpeaking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["PublicSpeaking"];
        public static string CurrentRole { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CurrentRole"];
        public static string TechStack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TechStack"];
        public static string Certifications { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Certifications"];
        public static string SpecialAwards { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SpecialAwards"];
        public static string Capitec { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Capitec"];
        public static string Back { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Back"];

    }

    public static class PublicSpeaking
    {
        private static string content = "content/publicspeaking.json";

        public static string dotnetConf2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Events:dotnetConf")["2023"];
        public static string googleIOExtended2024 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Events:googleIOExtended")["2024"];
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
        public static string CloudQuestSecurity { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["Security"];
        public static string CloudQuestNetworking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["Networking"];
        public static string CloudQuestServerless { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["Serverless"];
        public static string CloudQuestDataAnalytics { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["DataAnalytics"];
        public static string CloudQuestMachineLearning { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:CloudQuest")["MachineLearning"];
        public static string IndustryQuestHealthcare { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:IndustryQuest")["Healthcare"];
        public static string IndustryQuestManufacturingAuto { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:IndustryQuest")["ManufacturingAuto"];
        public static string IndustryQuestFinancialServices { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:IndustryQuest")["FinancialServices"];


        public static string EducateGettingStartedWithCompute { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithCompute"];
        public static string EducateGettingStartedWithServerless { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithServerless"];
        public static string EducateGettingStartedWithStorage { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithStorage"];
        public static string EducateIntroductionToCloud { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["IntroductionToCloud"];
        public static string EducateMachineLearningDeepRacer { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["MachineLearningDeepRacer"];
        public static string EducateGettingStartedWithDatabases { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithDatabases"];
        public static string EducateGettingStartedWithNetworking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithNetworking"];
        public static string EducateGettingStartedWithSecurity { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithSecurity"];
        public static string EducateGettingStartedWithCloudOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["GettingStartedWithCloudOps"];
        public static string EducateWebBuilder { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Educate")["WebBuilder"];

        public static string ProficientWellArchitected { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Proficient")["Well-Architected"];

        public static string KnowledgeArchitecting { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["Architecting"];
        public static string KnowledgeServerless { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["Serverless"];
        public static string KnowledgeCompute { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["Compute"];
        public static string KnowledgeBraket { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["Braket"];
        public static string KnowledgeEKS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["EKS"];
        public static string KnowledgeDataMigration { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["DataMigration"];
        public static string KnowledgeCloudEssentials { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["CloudEssentials"];
        public static string KnowledgeFileStorage { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["FileStorage"];
        public static string KnowledgeMigrationFoundations { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["MigrationFoundations"];
        public static string KnowledgeNetworkingCore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["NetworkingCore"];
        public static string KnowledgeStorageTechnologist { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["StorageTechnologist"];
        public static string KnowledgeStorageCore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["StorageCore"];
        public static string KnowledgeEventsAndFlows { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["EventsAndFlows"];
        public static string KnowledgeGamesCloudDev { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["GamesCloudDev"];
        public static string MediaEntertainment { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["MediaEntertainment"];
        public static string KnowledgeDataProtection { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Knowledge")["DataProtection"];

        public static string DotNetAppRunner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["AppRunner"];
        public static string DotNetLambda { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["Lambda"];
        public static string DotNetECS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["ECS"];
        public static string DotNetRekognition { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["Rekognition"];
        public static string DotNetTextract { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["Textract"];
        public static string DotNetApp2Container { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["App2Container"];
        public static string DotNetMigrationHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:DotNet")["MigrationHub"];

        
    }

    public static class Microsoft
    {
        private static string other = "content/other.json";
        //Certification: Other
        public static string MCT2018_2019 { get; set; } = new ConfigurationBuilder().AddJsonFile(other).Build().GetSection("Certifications:Microsoft:MCT")["2018-2019"];
        public static string MCT2022_2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(other).Build().GetSection("Certifications:Microsoft:MCT")["2022-2023"];

        //public static string MCT2022_2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(other).Build().GetSection("Certifications:Microsoft:MCT")["2022-2023"];
        //public static string Microsoft_cert_MCT2022_2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:Data")["MCT_2022-2023"];

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

        public static string Microsoft_cert_MCT_2022_2023 { get; set; } = new ConfigurationBuilder().AddJsonFile(microsoft).Build().GetSection("Certifications:CertificateID")["MCT_2022-2023"];
    }

    public static class PoE
    {
        private static string content = "content/images.json";

        public static string CV { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CV"];
        public static string Experience { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Experience"];
        public static string Projects { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Projects"];
    }

    public static class Projects
    {
        private static string content = "content/projects.json";

        public static string Website { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Projects")["Website"];
    }
}

namespace blog.Config.Tech.Links
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["React"];
    }

    public static class Frameworks
    {
        private static string content = "content/tech/frameworks.json";

        public static string dotnet { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["dotnet"];
        public static string dotnetcore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["dotnetcore"];
        public static string spring { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["spring"];
    }

    public static class ORM
    {
        private static string content = "content/tech/orm.json";

        public static string ODBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["ODBC"];
        public static string EF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["EF"];
        public static string EFCore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["EFCore"];
        public static string JDBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JDBC"];
    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["React"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["HTML5BoilerPlate"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["jQuery"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Bootstrap"];
        public static string ASPNET { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["ASP.NET"];
        public static string ASPNETMVC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["ASP.NET-MVC"];
        public static string Blazor { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Blazor"];
        public static string WPF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["WPF"];
        public static string WindowsForms { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["WindowsForms"];
        public static string MAUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MAUI"];
        public static string Xamarin { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Xamarin"];
        public static string SharePoint { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["SharePoint"];
    }

    public static class BackEnd
    {
        private static string content = "content/tech/backend.json";

        public static string WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["WCF"];
        public static string ASPAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["ASPAPI"];
        public static string Microservices { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Microservices"];
        public static string Swagger { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Swagger"];
        public static string SpringBoot { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["SpringBoot"];
    }

    public static class Cloud
    {
        private static string content = "content/tech/cloud.json";

        public static string AWS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AWS"];
        public static string Azure { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Azure"];
        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Google"];
    }

    public static class IoT
    {
        private static string content = "content/tech/iot.json";

        public static string Arduino { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Arduino"];
        public static string MQTT { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MQTT"];
        public static string RaspberryPi { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["RaspberryPi"];
    }

    public static class BigData
    {
        private static string content = "content/tech/bigdata.json";

        public static string Kafka { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Kafka"];
        public static string MSK { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MSK"];
        public static string KafkaUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["KafkaUI"];
        public static string Redpanda { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Redpanda"];
    }

    public static class Analytics
    {
        private static string content = "content/tech/analytics.json";

        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Google"];
        public static string PowerBI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["PowerBI"];
        public static string OLAP { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["OLAP"];
    }

    public static class Hosting
    {
        private static string content = "content/tech/hosting.json";

        public static string Apache { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Apache"];
        public static string xampp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["xampp"];
        public static string nginx { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["nginx"];
        public static string cPanel { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["cPanel"];
        public static string Joomla { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Joomla"];
        public static string Wordpress { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Wordpress"];
        public static string Bitnami { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Bitnami"];
        public static string IIS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["IIS"];

    }

    public static class SourceControl
    {
        private static string content = "content/tech/sourcecontrol.json";

        public static string Git { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Git"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["GitHub"];
        public static string GitLab { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["GitLab"];
        public static string AWSCodeCommit { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AWSCodeCommit"];
        public static string TFS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TFS"];
        public static string AzureDevOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzureDevOps"];
        public static string Bitbucket { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Bitbucket"];
        public static string TortoiseSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TortoiseSVN"];
        public static string VisualSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["VisualSVN"];
    }

    public static class TestingQA
    {
        private static string content = "content/tech/testingqa.json";

        public static string jMeter { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["jMeter"];
        public static string Insomnia { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Insomnia"];
        public static string Postman { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Postman"];
        public static string ReadyAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["ReadyAPI"];
        public static string TestComplete { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TestComplete"];
    }

    public static class DevOps
    {
        private static string content = "content/tech/devops.json";

        public static string Rancher { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Rancher"];
        public static string Consul { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Consul"];
        public static string Mirantis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Mirantis"];
        public static string Ansible { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Ansible"];
        public static string Jenkins { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Jenkins"];
        public static string Docker { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Docker"];
        public static string Terraform { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Terraform"];
        public static string K8S { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["K8S"];
        public static string Maven { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Maven"];
    }

    public static class Monitoring
    {
        private static string content = "content/tech/monitoring.json";

        public static string Instana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Instana"];
        public static string Grafana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Grafana"];
        public static string OpenSearch { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["OpenSearch"];
        public static string Elastic { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Elastic"];
        public static string PagerDuty { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["PagerDuty"];
    }

    public static class Databases
    {
        private static string content = "content/tech/databases.json";

        public static string MSSQLServer { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MSSQLServer"];
        public static string MySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["MySQL"];
        public static string PostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["PostgreSQL"];
        public static string AmazonDynamoDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonDynamoDB"];
        public static string AmazonRDS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonRDSAurora { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonRDSMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonRDSPostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonRDSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonRDSCustom { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRDS"];
        public static string AmazonDocumentDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonDocumentDB"];
        public static string AmazonRedshift { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AmazonRedshift"];
        public static string AzureCosmosDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzureCosmosDB"];
        public static string AzureSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzureSQL"];
        public static string AzurePostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzurePostgreSQL"];
        public static string AzureMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzureMySQL"];
        public static string AzureRedis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["AzureRedis"];
        public static string Redis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Redis"];
    }

    public static class Security
    {
        private static string content = "content/tech/security.json";

        public static string Vault { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Vault"];
        
    }

    public static class Software
    {
        private static string content = "content/tech/software.json";

        public static string JIRA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JIRA"];
        public static string Confluence { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Confluence"];
        public static string JIRASD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["JIRASD"];
        public static string Slack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Slack"];
        public static string Trello { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Trello"];
        public static string TerraformEnterprise { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TerraformEnterprise"];
        public static string TerraformCloud { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["TerraformCloud"];
        public static string Lucidchart { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Lucidchart"];
        public static string Lucidspark { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Lucidspark"];
        public static string Lucidscale { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["Lucidscale"];
        public static string DrawIO { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["DrawIO"];
        public static string EnterpriseArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["EnterpriseArchitect"];
        public static string C4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Links")["C4"];
    }
}

namespace blog.Config.Tech.Rating
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["React"];
    }

    public static class Frameworks
    {
        private static string content = "content/tech/frameworks.json";

        public static string dotnet { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["dotnet"];
        public static string dotnetcore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["dotnetcore"];
        public static string spring { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["spring"];
    }

    public static class ORM
    {
        private static string content = "content/tech/orm.json";

        public static string ODBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["ODBC"];
        public static string EF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["EF"];
        public static string EFCore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["EFCore"];
        public static string JDBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JDBC"];
    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["React"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["HTML5BoilerPlate"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["jQuery"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Bootstrap"];
        public static string ASPNET { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["ASP.NET"];
        public static string ASPNETMVC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["ASP.NET-MVC"];
        public static string Blazor { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Blazor"];
        public static string WPF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["WPF"];
        public static string WindowsForms { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["WindowsForms"];
        public static string MAUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["MAUI"];
        public static string Xamarin { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["Xamarin"];
        public static string SharePoint { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Ratings")["SharePoint"];
    }

    public static class BackEnd
    {
        private static string content = "content/tech/backend.json";

        public static string WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["WCF"];
        public static string ASPAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["ASPAPI"];
        public static string Microservices { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Microservices"];
        public static string Swagger { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Swagger"];
        public static string SpringBoot { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["SpringBoot"];
    }

    public static class Cloud
    {
        private static string content = "content/tech/cloud.json";

        public static string AWS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AWS"];
        public static string Azure { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Azure"];
        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Google"];
    }

    public static class IoT
    {
        private static string content = "content/tech/iot.json";

        public static string Arduino { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Arduino"];
        public static string MQTT { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["MQTT"];
        public static string RaspberryPi { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["RaspberryPi"];
    }

    public static class BigData
    {
        private static string content = "content/tech/bigdata.json";

        public static string Kafka { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Kafka"];
        public static string MSK { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["MSK"];
        public static string KafkaUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["KafkaUI"];
        public static string Redpanda { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Redpanda"];
    }

    public static class Analytics
    {
        private static string content = "content/tech/analyics.json";

        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Google"];
        public static string PowerBI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["PowerBI"];
        public static string OLAP { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["OLAP"];
    }

    public static class Hosting
    {
        private static string content = "content/tech/hosting.json";

        public static string Apache { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Apache"];
        public static string xampp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["xampp"];
        public static string nginx { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["nginx"];
        public static string cPanel { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["cPanel"];
        public static string Joomla { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Joomla"];
        public static string Wordpress { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Wordpress"];
        public static string Bitnami { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Bitnami"];
        public static string IIS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["IIS"];
    }

    public static class SourceControl
    {
        private static string content = "content/tech/sourcecontrol.json";

        public static string Git { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Git"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["GitHub"];
        public static string GitLab { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["GitLab"];
        public static string AWSCodeCommit { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AWSCodeCommit"];
        public static string TFS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TFS"];
        public static string AzureDevOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzureDevOps"];
        public static string Bitbucket { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Bitbucket"];
        public static string TortoiseSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TortoiseSVN"];
        public static string VisualSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["VisualSVN"];
    }

    public static class TestingQA
    {
        private static string content = "content/tech/testingqa.json";

        public static string jMeter { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["jMeter"];
        public static string Insomnia { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Insomnia"];
        public static string Postman { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Postman"];
        public static string ReadyAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["ReadyAPI"];
        public static string TestComplete { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TestComplete"];
    }

    public static class DevOps
    {
        private static string content = "content/tech/devops.json";

        public static string Rancher { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Rancher"];
        public static string Consul { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Consul"];
        public static string Mirantis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Mirantis"];
        public static string Ansible { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Ansible"];
        public static string Jenkins { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Jenkins"];
        public static string Docker { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Docker"];
        public static string Terraform { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Terraform"];
        public static string K8S { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["K8S"];
        public static string Maven { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Maven"];
    }

    public static class Monitoring
    {
        private static string content = "content/tech/monitoring.json";

        public static string Instana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Instana"];
        public static string Grafana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Grafana"];
        public static string OpenSearch { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["OpenSearch"];
        public static string Elastic { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Elastic"];
        public static string PagerDuty { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["PagerDuty"];
    }

    public static class Databases
    {
        private static string content = "content/tech/databases.json";

        public static string MSSQLServer { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["MSSQLServer"];
        public static string MySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["MySQL"];
        public static string PostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["PostgreSQL"];
        public static string AmazonDynamoDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonDynamoDB"];
        public static string AmazonRDS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonRDSAurora { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonRDSMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonRDSPostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonRDSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonRDSCustom { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRDS"];
        public static string AmazonDocumentDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonDocumentDB"];
        public static string AmazonRedshift { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AmazonRedshift"];
        public static string AzureCosmosDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzureCosmosDB"];
        public static string AzureSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzureSQL"];
        public static string AzurePostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzurePostgreSQL"];
        public static string AzureMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzureMySQL"];
        public static string AzureRedis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["AzureRedis"];
        public static string Redis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Redis"];
    }

    public static class Security
    {
        private static string content = "content/tech/security.json";

        public static string Vault { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Vault"];

    }

    public static class Software
    {
        private static string content = "content/tech/software.json";

        public static string JIRA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JIRA"];
        public static string Confluence { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Confluence"];
        public static string JIRASD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["JIRA"];
        public static string Slack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Slack"];
        public static string Trello { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Trello"];
        public static string TerraformEnterprise { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TerraformEnterprise"];
        public static string TerraformCloud { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["TerraformCloud"];
        public static string Lucidchart { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Lucidchart"];
        public static string Lucidspark { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Lucidspark"];
        public static string Lucidscale { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["Lucidscale"];
        public static string DrawIO { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["DrawIO"];
        public static string EnterpriseArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["EnterpriseArchitect"];
        public static string C4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Rating")["C4"];
    }
}

namespace blog.Config.Images.TechStack
{
    public static class Languages
    {
        private static string content = "content/tech/languages.json";

        public static string CSharp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["C#"];
        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["React"];
    }

    public static class Frameworks
    {
        private static string content = "content/tech/frameworks.json";

        public static string dotnet { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["dotnet"];
        public static string dotnetcore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["dotnetcore"];
        public static string spring { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["spring"];
    }

    public static class ORM
    {
        private static string content = "content/tech/orm.json";

        public static string ODBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["ODBC"];
        public static string EF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["EF"];
        public static string EFCore { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["EFCore"];
        public static string JDBC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JDBC"];
    }

    public static class FrontEnd
    {
        private static string content = "content/tech/frontend.json";

        public static string JAVA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JAVA"];
        public static string Javascript { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Javascript"];
        public static string Python { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Python"];
        public static string Angular { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Angular"];
        public static string React { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["React"];
        public static string HTML5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["HTML5"];
        public static string HTML5BoilerPlate { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["HTML5BoilerPlate"];
        public static string CSS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CSS"];
        public static string jQuery { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["jQuery"];
        public static string Bootstrap { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Bootstrap"];
        public static string ASPNET { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["ASP.NET"];
        public static string ASPNETMVC { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["ASP.NET-MVC"];
        public static string Blazor { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Blazor"];
        public static string WPF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["WPF"];
        public static string WindowsForms { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["WindowsForms"];
        public static string MAUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MAUI"];
        public static string Xamarin { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Xamarin"];
        public static string SharePoint { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SharePoint"];
    }

    public static class BackEnd
    {
        private static string content = "content/tech/backend.json";

        public static string WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["WCF"];
        public static string ASPAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["ASPAPI"];
        public static string Microservices { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Microservices"];
        public static string Swagger { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Swagger"];
        public static string SpringBoot { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SpringBoot"];
    }

    public static class Cloud
    {
        private static string content = "content/tech/cloud.json";

        public static string AWS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AWS"];
        public static string Azure { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Azure"];
        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Google"];
    }

    public static class IoT
    {
        private static string content = "content/tech/iot.json";

        public static string Arduino { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Arduino"];
        public static string MQTT { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MQTT"];
        public static string RaspberryPi { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["RaspberryPi"];
    }

    public static class BigData
    {
        private static string content = "content/tech/bigdata.json";

        public static string Kafka { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Kafka"];
        public static string MSK { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MSK"];
        public static string KafkaUI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["KafkaUI"];
        public static string Redpanda { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Redpanda"];
    }

    public static class Analytics
    {
        private static string content = "content/tech/analytics.json";

        public static string Google { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Google"];
        public static string PowerBI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["PowerBI"];
        public static string OLAP { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["OLAP"];
    }

    public static class Hosting
    {
        private static string content = "content/tech/hosting.json";

        public static string Apache { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Apache"];
        public static string xampp { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["xampp"];
        public static string nginx { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["nginx"];
        public static string cPanel { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["cPanel"];
        public static string Joomla { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Joomla"];
        public static string Wordpress { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Wordpress"];
        public static string Bitnami { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Bitnami"];
        public static string IIS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["IIS"];
    }

    public static class SourceControl
    {
        private static string content = "content/tech/sourcecontrol.json";

        public static string Git { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Git"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["GitHub"];
        public static string GitLab { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["GitLab"];
        public static string AWSCodeCommit { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AWSCodeCommit"];
        public static string TFS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TFS"];
        public static string AzureDevOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzureDevOps"];
        public static string Bitbucket { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Bitbucket"];
        public static string TortoiseSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TortoiseSVN"];
        public static string VisualSVN { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["VisualSVN"];
    }

    public static class TestingQA
    {
        private static string content = "content/tech/testingqa.json";

        public static string jMeter { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["jMeter"];
        public static string Insomnia { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Insomnia"];
        public static string Postman { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Postman"];
        public static string ReadyAPI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["ReadyAPI"];
        public static string TestComplete { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TestComplete"];
    }

    public static class DevOps
    {
        private static string content = "content/tech/devops.json";

        public static string Rancher { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Rancher"];
        public static string Consul { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Consul"];
        public static string Mirantis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Mirantis"];
        public static string Ansible { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Ansible"];
        public static string Jenkins { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Jenkins"];
        public static string Docker { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Docker"];
        public static string Terraform { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Terraform"];
        public static string K8S { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["K8S"];
        public static string Maven { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Maven"];
    }

    public static class Monitoring
    {
        private static string content = "content/tech/monitoring.json";

        public static string Instana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Instana"];
        public static string Grafana { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Grafana"];
        public static string OpenSearch { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["OpenSearch"];
        public static string Elastic { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Elastic"];
        public static string PagerDuty { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["PagerDuty"];
    }

    public static class Databases
    {
        private static string content = "content/tech/databases.json";

        public static string MSSQLServer { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MSSQLServer"];
        public static string MySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["MySQL"];
        public static string PostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["PostgreSQL"];
        public static string AmazonDynamoDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonDynamoDB"];
        public static string AmazonRDS { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDS"];
        public static string AmazonRDSAurora { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDSAurora"];
        public static string AmazonRDSMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDSMySQL"];
        public static string AmazonRDSPostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDSPostgreSQL"];
        public static string AmazonRDSSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDSSQL"];
        public static string AmazonRDSCustom { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRDSCustom"];
        public static string AmazonDocumentDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonDocumentDB"];
        public static string AmazonRedshift { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AmazonRedshift"];
        public static string AzureCosmosDB { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzureCosmosDB"];
        public static string AzureSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzureSQL"];
        public static string AzurePostgreSQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzurePostgreSQL"];
        public static string AzureMySQL { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzureMySQL"];
        public static string AzureRedis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["AzureRedis"];
        public static string Redis { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Redis"];
    }

    public static class Security
    {
        private static string content = "content/tech/security.json";

        public static string Vault { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Vault"];
    }

    public static class Software
    {
        private static string content = "content/tech/software.json";

        public static string JIRA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JIRA"];
        public static string Confluence { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Confluence"];
        public static string JIRASD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["JIRA"];
        public static string Slack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Slack"];
        public static string Trello { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Trello"];
        public static string TerraformEnterprise { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TerraformEnterprise"];
        public static string TerraformCloud { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TerraformCloud"];
        public static string Lucidchart { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Lucidchart"];
        public static string Lucidspark { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Lucidspark"];
        public static string Lucidscale { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Lucidscale"];
        public static string DrawIO { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["DrawIO"];
        public static string EnterpriseArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["EnterpriseArchitect"];
        public static string C4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["C4"];
    }
}