package com.bot.botback.repository;

import com.bot.botback.model.MemoryVault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MemoryVaultRepository extends JpaRepository<MemoryVault, Long> {

    List<MemoryVault> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query(value = """
            SELECT id, user_id, fact, embedding, created_at
            FROM memory_vault
            WHERE user_id = :userId
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<MemoryVault> findTopSimilarFacts(@Param("userId") Long userId,
                                         @Param("embedding") String embedding,
                                         @Param("limit") int limit);
}
